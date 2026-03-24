package com.preventia.appointment.controller;

import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.appointment.service.AppointmentService;
import com.preventia.auth.repository.UserRepository;
import com.preventia.chat.service.ChatNotificationService;
import com.preventia.family.domain.User;
import com.preventia.ops.service.WebhookEventLogService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

/**
 * Dedicated webhook controller for Daily.co room lifecycle events.
 *
 * Security: Every POST is authenticated via HMAC-SHA256 before processing.
 * Daily.co signs the raw body with the shared webhook secret and sends the
 * hex digest in the {@code Daily-Signature} header. Constant-time comparison
 * prevents timing attacks.
 *
 * Events:
 *  - meeting-ended   → AppointmentStatus.LOCKED  (primary EMR lock trigger)
 *  - meeting-started → AppointmentStatus.ACTIVE  (belt-and-suspenders fallback)
 */
@RestController
@RequestMapping("/webhooks")
public class DailyWebhookController {

    private static final Logger log              = LoggerFactory.getLogger(DailyWebhookController.class);
    private static final String HMAC_ALGO        = "HmacSHA256";
    private static final String SIGNATURE_HEADER = "Daily-Signature";

    private static final DateTimeFormatter DATE_FMT =
        DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a").withZone(ZoneId.of("Asia/Kolkata"));

    private final AppointmentService      appointmentService;
    private final AppointmentRepository   appointmentRepository;
    private final ChatNotificationService chatNotificationService;
    private final UserRepository          userRepository;
    private final WebhookEventLogService  webhookEventLogService;
    private final ObjectMapper            objectMapper;
    private final byte[]                  secretBytes;

    public DailyWebhookController(AppointmentService appointmentService,
                                   AppointmentRepository appointmentRepository,
                                   ChatNotificationService chatNotificationService,
                                   UserRepository userRepository,
                                   WebhookEventLogService webhookEventLogService,
                                   ObjectMapper objectMapper,
                                   @Value("${daily.webhook-secret}") String webhookSecret) {
        this.appointmentService      = appointmentService;
        this.appointmentRepository   = appointmentRepository;
        this.chatNotificationService = chatNotificationService;
        this.userRepository          = userRepository;
        this.webhookEventLogService  = webhookEventLogService;
        this.objectMapper            = objectMapper;
        this.secretBytes             = webhookSecret.getBytes(StandardCharsets.UTF_8);
    }

    @PostMapping("/daily")
    public ResponseEntity<Void> handle(HttpServletRequest request) {
        byte[] body;
        try {
            body = request.getInputStream().readAllBytes();
        } catch (IOException e) {
            webhookEventLogService.record("DAILY", "/webhooks/daily", "invalid_body", null, null, 400, null, "Unable to read request body");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        if (!isValid(body, request.getHeader(SIGNATURE_HEADER))) {
            log.warn("[DailyWebhook] Signature validation FAILED");
            webhookEventLogService.record("DAILY", "/webhooks/daily", "signature_failed", null, null, 401, false, "Daily webhook signature mismatch");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(body, new TypeReference<>() {});
        } catch (IOException e) {
            webhookEventLogService.record("DAILY", "/webhooks/daily", "invalid_json", null, null, 400, true, "Daily webhook payload could not be parsed");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        String action   = String.valueOf(payload.getOrDefault("action", ""));
        String roomName = extractRoomName(payload);
        log.info("[DailyWebhook] action={} room={}", action, roomName);

        if (!roomName.isBlank()) {
            switch (action) {
                case "meeting-started" -> appointmentService.handleDailyWebhook(payload);
                case "meeting-ended"   -> {
                    appointmentService.handleDailyWebhook(payload);
                    // CHAT-010: Check for patient no-show on meeting-ended
                    handlePatientNoShow(payload, roomName);
                }
                default -> log.debug("[DailyWebhook] Unhandled action={}", action);
            }
        }
        webhookEventLogService.record(
            "DAILY",
            "/webhooks/daily",
            action.isBlank() ? "unknown" : action,
            roomName,
            roomName,
            200,
            true,
            summarizePayload(action, roomName)
        );
        return ResponseEntity.ok().build();
    }

    private boolean isValid(byte[] body, String received) {
        if (received == null || received.isBlank()) return false;
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(secretBytes, HMAC_ALGO));
            String expected = HexFormat.of().formatHex(mac.doFinal(body));
            return MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    received.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            log.error("[DailyWebhook] HMAC error: {}", e.getMessage());
            return false;
        }
    }

    @SuppressWarnings("unchecked")
    private String extractRoomName(Map<String, Object> payload) {
        Object room = payload.get("room");
        if (room instanceof Map<?, ?> r) {
            Object name = ((Map<String, Object>) r).get("name");
            return name != null ? String.valueOf(name) : "";
        }
        return "";
    }

    private String summarizePayload(String action, String roomName) {
        return "action=" + action + (roomName.isBlank() ? "" : ", room=" + roomName);
    }

    /**
     * CHAT-010: Patient no-show check on meeting-ended.
     * If the recipient was never in the participant list, send a missed appointment message.
     */
    @SuppressWarnings("unchecked")
    private void handlePatientNoShow(Map<String, Object> payload, String roomName) {
        appointmentRepository.findByDailyRoomName(roomName).ifPresent(appt -> {
            try {
                Object participantsObj = payload.get("participants");
                if (!(participantsObj instanceof List<?> participantsList)) return;

                boolean patientWasPresent = participantsList.stream()
                    .filter(p -> p instanceof Map<?, ?>)
                    .map(p -> (Map<String, Object>) p)
                    .anyMatch(p -> String.valueOf(appt.getRecipientId())
                        .equals(String.valueOf(p.getOrDefault("user_id", ""))));

                if (!patientWasPresent) {
                    log.info("[DailyWebhook] CHAT-010: Patient no-show for apptId={}", appt.getId());
                    String doctorName = userRepository.findById(appt.getDoctorId())
                        .map(User::getName).orElse("your doctor");
                    String dateStr = DATE_FMT.format(appt.getStartTime());

                    chatNotificationService.sendPatientNoShow(
                        appt.getDoctorId(), appt.getRecipientId(),
                        doctorName, dateStr,
                        appt.getSponsorId(), appt.getId()
                    );
                }
            } catch (Exception e) {
                log.warn("[DailyWebhook] Error in patient no-show check for apptId={}: {}", appt.getId(), e.getMessage());
            }
        });
    }
}
