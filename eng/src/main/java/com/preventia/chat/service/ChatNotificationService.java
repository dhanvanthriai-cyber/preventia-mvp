package com.preventia.chat.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * ChatNotificationService — sends system bot messages via the Stream Chat REST API.
 *
 * Operates in STUB mode when no real Stream credentials are configured.
 * All methods are non-fatal: failures are logged but never propagate to callers.
 *
 * SPRINT-07: sendAppointmentConfirmation
 * SPRINT-08: sendSystemMessage, sendSponsorChannelMessage, createSponsorDoctorChannel,
 *            sendCareSummaryToSponsor, startPharmacyClarificationChannel,
 *            sendPatientNoShow, sendDoctorNoShow, sendSponsorJoinLink
 */
@Service
public class ChatNotificationService {

    private static final Logger log = LoggerFactory.getLogger(ChatNotificationService.class);
    private static final String STUB_API_KEY = "STUB_KEY";
    private static final String BOT_USER_ID  = "preventia-bot";
    private static final DateTimeFormatter IST_FMT =
        DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a").withZone(ZoneId.of("Asia/Kolkata"));

    @Value("${stream.api-key:STUB_KEY}")
    private String apiKey;

    @Value("${stream.api-secret:STUB_SECRET}")
    private String apiSecret;

    @Value("${app.portal-url:https://app.preventia.ai}")
    private String portalUrl;

    private final RestClient restClient;

    public ChatNotificationService() {
        this.restClient = RestClient.create();
    }

    // -------------------------------------------------------------------------
    // SPRINT-07: Appointment confirmation
    // -------------------------------------------------------------------------

    /**
     * Send an appointment confirmation message to the doctor-patient channel.
     */
    public void sendAppointmentConfirmation(Long doctorId, Long recipientId,
                                            Long appointmentId, String doctorName,
                                            OffsetDateTime startTime) {
        if (isStub()) {
            log.info("[ChatNotification] STUB — confirmation for appt {}", appointmentId);
            return;
        }

        String channelId = buildChannelId(doctorId, recipientId);
        String istTime   = IST_FMT.format(startTime);

        String text = String.format(
            "✅ Appointment confirmed!\n📅 %s IST\n👨‍⚕️ Dr. %s\n🆔 Appt #%d",
            istTime, doctorName, appointmentId
        );

        sendToChannel(channelId, text);
    }

    // -------------------------------------------------------------------------
    // SPRINT-08: Generic system message to patient-doctor channel
    // -------------------------------------------------------------------------

    /**
     * Send a plain system message to the patient-doctor channel.
     * Used for appointment reminders (CHAT-003) and no-show notifications.
     */
    public void sendSystemMessage(Long doctorId, Long recipientId, String text) {
        if (isStub()) {
            log.info("[ChatNotification] STUB — system message: {}", text.substring(0, Math.min(60, text.length())));
            return;
        }
        String channelId = buildChannelId(doctorId, recipientId);
        sendToChannel(channelId, text);
    }

    // -------------------------------------------------------------------------
    // SPRINT-08: Sponsor-doctor channel messages
    // -------------------------------------------------------------------------

    /**
     * Send a message to the sponsor-doctor update channel.
     * Channel ID: "sponsor-{sponsorId}__doctor-{doctorId}"
     */
    public void sendSponsorChannelMessage(Long sponsorId, Long doctorId, String text) {
        if (isStub()) {
            log.info("[ChatNotification] STUB — sponsor channel message for sponsor={} doctor={}", sponsorId, doctorId);
            return;
        }
        String channelId = buildSponsorDoctorChannelId(sponsorId, doctorId);
        sendToChannel(channelId, text);
    }

    /**
     * CHAT-006: Create a sponsor-doctor update channel when consent is GRANTED.
     *
     * @param sponsorId   DB id of the sponsor
     * @param doctorId    DB id of the doctor
     * @param sponsorName display name
     * @param doctorName  display name
     * @param patientName display name of the patient
     */
    public void createSponsorDoctorChannel(Long sponsorId, Long doctorId,
            String sponsorName, String doctorName, String patientName) {
        if (isStub()) {
            log.info("[ChatNotification] STUB — creating sponsor-doctor channel sponsor={} doctor={}", sponsorId, doctorId);
            return;
        }

        String channelId = buildSponsorDoctorChannelId(sponsorId, doctorId);

        try {
            String jwt = buildBotJwt();
            String url = "https://chat.stream-io-api.com/channels/messaging/" + channelId;

            Map<String, Object> body = new HashMap<>();
            body.put("data", Map.of(
                "name",    "Updates for " + patientName,
                "members", new String[]{ String.valueOf(sponsorId), String.valueOf(doctorId) }
            ));

            restClient.post()
                .uri(url)
                .header("Content-Type", "application/json")
                .header("Authorization", jwt)
                .header("stream-auth-type", "jwt")
                .body(body)
                .retrieve()
                .toBodilessEntity();

            // Send welcome message
            String welcomeText = String.format(
                "This is your private channel with Dr. %s. " +
                "You'll receive updates about %s's care here.",
                doctorName, patientName
            );
            sendToChannel(channelId, welcomeText);

            log.info("[ChatNotification] Sponsor-doctor channel created: {}", channelId);
        } catch (Exception e) {
            log.warn("[ChatNotification] Failed to create sponsor-doctor channel {}: {}", channelId, e.getMessage());
        }
    }

    /**
     * CHAT-006: Send a post-consultation care summary to the sponsor-doctor channel.
     *
     * @param sponsorId     DB id of the sponsor
     * @param doctorId      DB id of the doctor
     * @param appointmentId ID of the appointment
     * @param summaryText   plain-text care summary
     */
    public void sendCareSummaryToSponsor(Long sponsorId, Long doctorId,
            Long appointmentId, String summaryText) {
        if (isStub()) {
            log.info("[ChatNotification] STUB — care summary for sponsor={} appt={}", sponsorId, appointmentId);
            return;
        }

        String channelId = buildSponsorDoctorChannelId(sponsorId, doctorId);

        try {
            String jwt = buildBotJwt();
            String url = "https://chat.stream-io-api.com/channels/messaging/" + channelId + "/message";

            Map<String, Object> extraData = new HashMap<>();
            extraData.put("type", "care_summary");
            extraData.put("appointmentId", appointmentId);

            Map<String, Object> message = new HashMap<>();
            message.put("text", "📋 Care Summary:\n\n" + summaryText);
            message.put("user_id", BOT_USER_ID);
            message.put("extra_data", extraData);

            Map<String, Object> body = Map.of("message", message);

            restClient.post()
                .uri(url)
                .header("Content-Type", "application/json")
                .header("Authorization", jwt)
                .header("stream-auth-type", "jwt")
                .body(body)
                .retrieve()
                .toBodilessEntity();

            log.info("[ChatNotification] Care summary sent to sponsor-doctor channel {} for appt {}", channelId, appointmentId);
        } catch (Exception e) {
            log.warn("[ChatNotification] Failed to send care summary: {}", e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // SPRINT-08 CHAT-007: Pharmacy clarification channel
    // -------------------------------------------------------------------------

    /**
     * Create a pharmacist-doctor clarification channel for a prescription.
     *
     * @param pharmacistId DB id of the pharmacist
     * @param doctorId     DB id of the prescribing doctor
     * @param soapNoteId   ID of the SOAP note / prescription
     * @param appointmentId appointment context
     * @return the Stream channel ID created
     */
    public String startPharmacyClarificationChannel(Long pharmacistId, Long doctorId,
            Long soapNoteId, Long appointmentId) {
        String channelId = "rx-" + soapNoteId;

        if (isStub()) {
            log.info("[ChatNotification] STUB — pharmacy clarification channel rx-{}", soapNoteId);
            return channelId;
        }

        try {
            String jwt = buildBotJwt();
            String url = "https://chat.stream-io-api.com/channels/messaging/" + channelId;

            Map<String, Object> body = new HashMap<>();
            body.put("data", Map.of(
                "name",    "Rx Clarification — Prescription #" + soapNoteId,
                "members", new String[]{ String.valueOf(pharmacistId), String.valueOf(doctorId) }
            ));

            restClient.post()
                .uri(url)
                .header("Content-Type", "application/json")
                .header("Authorization", jwt)
                .header("stream-auth-type", "jwt")
                .body(body)
                .retrieve()
                .toBodilessEntity();

            // Send initial clarification request message
            String initMsg = String.format(
                "Clarification needed on prescription for appointment #%d (Soap Note #%d).",
                appointmentId, soapNoteId
            );
            sendToChannel(channelId, initMsg);

            log.info("[ChatNotification] Pharmacy clarification channel created: {}", channelId);
        } catch (Exception e) {
            log.warn("[ChatNotification] Failed to create pharmacy clarification channel {}: {}", channelId, e.getMessage());
        }

        return channelId;
    }

    // -------------------------------------------------------------------------
    // SPRINT-08 CHAT-010/011: No-show messages
    // -------------------------------------------------------------------------

    /**
     * CHAT-010: Patient did not join — send a missed appointment message.
     */
    public void sendPatientNoShow(Long doctorId, Long recipientId,
            String doctorName, String appointmentDate, Long sponsorId, Long appointmentId) {
        String text = String.format(
            "😔 We missed you today!\n" +
            "Your consultation with Dr. %s on %s was missed.\n" +
            "Book your next appointment here: %s/sponsor/book",
            doctorName, appointmentDate, portalUrl
        );

        sendSystemMessage(doctorId, recipientId, text);

        if (sponsorId != null) {
            sendSponsorChannelMessage(sponsorId, doctorId, text);
        }

        log.info("[ChatNotification] Patient no-show message sent for apptId={}", appointmentId);
    }

    /**
     * CHAT-011: Doctor has not joined — send a doctor running-late message to the patient.
     */
    public void sendDoctorNoShow(Long doctorId, Long recipientId,
            String doctorName, String clinicPhone, Long sponsorId, Long appointmentId) {
        String text = String.format(
            "⏳ Dr. %s is running late.\n" +
            "Our support team has been notified. We'll have an update for you shortly.\n" +
            "Clinic contact: %s",
            doctorName, clinicPhone
        );

        sendSystemMessage(doctorId, recipientId, text);

        if (sponsorId != null) {
            sendSponsorChannelMessage(sponsorId, doctorId, text);
        }

        log.info("[ChatNotification] Doctor no-show message sent for apptId={}", appointmentId);
    }

    // -------------------------------------------------------------------------
    // SPRINT-08 VIDEO-002: Sponsor observer join link
    // -------------------------------------------------------------------------

    /**
     * VIDEO-002: Send the sponsor observer join link when the appointment goes ACTIVE.
     */
    public void sendSponsorJoinLink(Long appointmentId, Long sponsorId, Long doctorId,
            String patientName, String doctorName,
            String dailyRoomUrl, String sponsorToken) {
        if (isStub()) {
            log.info("[ChatNotification] STUB — sponsor join link for appt={}", appointmentId);
            return;
        }

        String joinUrl = dailyRoomUrl + (sponsorToken != null ? "?t=" + sponsorToken : "");

        String text = String.format(
            "🔴 Consultation is now live!\n" +
            "%s's consultation with Dr. %s has started.\n" +
            "Join as an observer: %s\n" +
            "Note: Your camera and mic will be off by default.",
            patientName, doctorName, joinUrl
        );

        sendSponsorChannelMessage(sponsorId, doctorId, text);
        log.info("[ChatNotification] Sponsor join link sent for appt={} sponsor={}", appointmentId, sponsorId);
    }

    // -------------------------------------------------------------------------
    // SPRINT-08 CONSULT-010: Emergency escalation message
    // -------------------------------------------------------------------------

    /**
     * CONSULT-010: Send an emergency escalation message to the doctor's channel.
     */
    public void sendEmergencyEscalation(Long doctorId, Long recipientId, String patientName) {
        String text = "⚠️ EMERGENCY ESCALATION — " + patientName + "\n" +
                      "Patient has triggered the emergency button. Please respond immediately.";

        sendSystemMessage(doctorId, recipientId, text);
        log.warn("[ChatNotification] Emergency escalation sent for patient={} doctor={}", patientName, doctorId);
    }

    // -------------------------------------------------------------------------
    // SPRINT-08 CONSULT-006: Chat fallback notification
    // -------------------------------------------------------------------------

    /**
     * CONSULT-006: Notify the doctor that the patient is switching to chat due to video failure.
     */
    public void sendChatFallbackNotification(Long doctorId, Long recipientId, String patientName) {
        String text = String.format(
            "📵 %s is having video issues after multiple attempts.\n" +
            "Please switch to chat to continue the consultation.",
            patientName
        );
        sendSystemMessage(doctorId, recipientId, text);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private boolean isStub() {
        return STUB_API_KEY.equals(apiKey);
    }

    /**
     * Deterministic channel ID for doctor-patient: sorted IDs joined with __ (matches frontend).
     */
    private String buildChannelId(Long doctorId, Long recipientId) {
        long lo = Math.min(doctorId, recipientId);
        long hi = Math.max(doctorId, recipientId);
        return lo + "__" + hi;
    }

    /**
     * Deterministic channel ID for sponsor-doctor channel.
     */
    private String buildSponsorDoctorChannelId(Long sponsorId, Long doctorId) {
        return "sponsor-" + sponsorId + "__doctor-" + doctorId;
    }

    private void sendToChannel(String channelId, String text) {
        try {
            String jwt = buildBotJwt();
            String url = "https://chat.stream-io-api.com/channels/messaging/" + channelId + "/message";

            Map<String, Object> body = Map.of(
                "message", Map.of(
                    "text",    text,
                    "user_id", BOT_USER_ID
                )
            );

            restClient.post()
                .uri(url)
                .header("Content-Type", "application/json")
                .header("Authorization", jwt)
                .header("stream-auth-type", "jwt")
                .body(body)
                .retrieve()
                .toBodilessEntity();

            log.info("[ChatNotification] Message sent to channel {}", channelId);
        } catch (Exception e) {
            log.warn("[ChatNotification] Failed to send to channel {}: {}", channelId, e.getMessage());
        }
    }

    /**
     * Generate a Stream server-side JWT for preventia-bot.
     */
    private String buildBotJwt() {
        SecretKey key = Keys.hmacShaKeyFor(apiSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
            .claim("user_id", BOT_USER_ID)
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }
}
