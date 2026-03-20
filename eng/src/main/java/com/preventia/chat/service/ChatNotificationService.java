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
import java.util.Map;

/**
 * ChatNotificationService — sends system bot messages via the Stream Chat REST API.
 *
 * Used to post appointment confirmation messages into the doctor-patient channel
 * when an appointment is booked. Operates in STUB mode when no real Stream
 * credentials are configured.
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

    private final RestClient restClient;

    public ChatNotificationService() {
        this.restClient = RestClient.create();
    }

    /**
     * Send an appointment confirmation message to the doctor-patient channel.
     *
     * @param doctorId      DB id of the doctor
     * @param recipientId   DB id of the patient/recipient
     * @param appointmentId DB id of the appointment
     * @param doctorName    display name of the doctor
     * @param startTime     scheduled start time (will be formatted in IST)
     */
    public void sendAppointmentConfirmation(Long doctorId, Long recipientId,
                                            Long appointmentId, String doctorName,
                                            OffsetDateTime startTime) {
        if (STUB_API_KEY.equals(apiKey)) {
            log.info("[ChatNotification] STUB mode — skipping confirmation for appt {} (no Stream credentials)",
                appointmentId);
            return;
        }

        String channelId = buildChannelId(doctorId, recipientId);
        String istTime   = IST_FMT.format(startTime);

        String text = String.format(
            "✅ Appointment confirmed!\n📅 %s IST\n👨‍⚕️ Dr. %s\n🆔 Appt #%d",
            istTime, doctorName, appointmentId
        );

        try {
            String jwt   = buildBotJwt();
            String url   = "https://chat.stream-io-api.com/channels/messaging/" + channelId + "/message";

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

            log.info("[ChatNotification] Confirmation sent to channel {} for appt {}", channelId, appointmentId);

        } catch (Exception e) {
            // Non-fatal — appointment is already persisted; chat notification is best-effort
            log.warn("[ChatNotification] Failed to send confirmation for appt {}: {}", appointmentId, e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Deterministic channel ID: sorted IDs joined with __ (matches frontend ChatPanel logic).
     */
    private String buildChannelId(Long doctorId, Long recipientId) {
        long lo = Math.min(doctorId, recipientId);
        long hi = Math.max(doctorId, recipientId);
        return lo + "__" + hi;
    }

    /**
     * Generate a Stream server-side JWT for preventia-bot.
     * Same HS256 pattern as {@link StreamChatService#generateToken}.
     */
    private String buildBotJwt() {
        SecretKey key = Keys.hmacShaKeyFor(apiSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
            .claim("user_id", BOT_USER_ID)
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }
}
