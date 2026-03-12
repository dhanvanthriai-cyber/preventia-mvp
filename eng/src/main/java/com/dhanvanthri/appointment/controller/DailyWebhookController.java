package com.dhanvanthri.appointment.controller;

import com.dhanvanthri.appointment.service.AppointmentService;
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
import java.util.HexFormat;
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

    private final AppointmentService appointmentService;
    private final ObjectMapper        objectMapper;
    private final byte[]              secretBytes;

    public DailyWebhookController(AppointmentService appointmentService,
                                   ObjectMapper objectMapper,
                                   @Value("${daily.webhook-secret}") String webhookSecret) {
        this.appointmentService = appointmentService;
        this.objectMapper       = objectMapper;
        this.secretBytes        = webhookSecret.getBytes(StandardCharsets.UTF_8);
    }

    @PostMapping("/daily")
    public ResponseEntity<Void> handle(HttpServletRequest request) {
        byte[] body;
        try {
            body = request.getInputStream().readAllBytes();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        if (!isValid(body, request.getHeader(SIGNATURE_HEADER))) {
            log.warn("[DailyWebhook] Signature validation FAILED");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(body, new TypeReference<>() {});
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        String action   = String.valueOf(payload.getOrDefault("action", ""));
        String roomName = extractRoomName(payload);
        log.info("[DailyWebhook] action={} room={}", action, roomName);

        if (!roomName.isBlank()) {
            switch (action) {
                case "meeting-started" -> appointmentService.handleDailyWebhook(payload);
                case "meeting-ended"   -> appointmentService.handleDailyWebhook(payload);
                default -> log.debug("[DailyWebhook] Unhandled action={}", action);
            }
        }
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
}
