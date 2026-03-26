package com.preventia.chat.service;

import com.preventia.chat.dto.ChatTokenResponse;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * StreamChatService — generates Stream Chat user tokens.
 *
 * Stream Chat user tokens are HS256 JWTs with a single claim:
 *   { "user_id": "<userId>" }
 * signed with the Stream API secret.
 *
 * This matches the Stream Chat authentication spec exactly and does not
 * require the Stream server SDK — we reuse the JJWT library already in the
 * classpath for our own JWTs.
 *
 * STUB mode: when STREAM_API_KEY == "STUB_KEY" (no real key configured),
 * a stub token is returned so the backend starts cleanly without credentials.
 * The frontend ChatPanel detects "STUB_KEY" and shows a placeholder UI.
 */
@Service
public class StreamChatService {

    private static final Logger log = LoggerFactory.getLogger(StreamChatService.class);
    private static final String STUB_API_KEY = "STUB_KEY";
    private static final String BOT_USER_ID  = "preventia-bot";
    private static final String STREAM_API   = "https://chat.stream-io-api.com";

    @Value("${stream.api-key:STUB_KEY}")
    private String apiKey;

    @Value("${stream.api-secret:STUB_SECRET}")
    private String apiSecret;

    private final RestClient restClient;

    public StreamChatService() {
        this.restClient = RestClient.create();
    }

    /**
     * Generates a Stream Chat user token for the given user.
     *
     * @param userId   Internal DB user ID (used as Stream user ID)
     * @param userName Display name registered on Stream
     * @param role     User role (DOCTOR, RECIPIENT, etc.) — stored on Stream as custom data
     * @return {@link ChatTokenResponse} containing token, userId string, and apiKey
     */
    public ChatTokenResponse generateToken(Long userId, String userName, String role) {
        String userIdStr = userId.toString();

        if (STUB_API_KEY.equals(apiKey)) {
            log.info("[stream-chat] STUB mode — returning stub token for userId={}", userId);
            return new ChatTokenResponse("stub_token_" + userId, userIdStr, STUB_API_KEY);
        }

        try {
            // Stream Chat user token = HS256 JWT signed with the API secret
            // Payload must contain exactly: { "user_id": "<userId>" }
            SecretKey key = Keys.hmacShaKeyFor(apiSecret.getBytes(StandardCharsets.UTF_8));

            String token = Jwts.builder()
                .claim("user_id", userIdStr)
                .signWith(key, Jwts.SIG.HS256)
                .compact();

            log.info("[stream-chat] Token generated for userId={} role={}", userId, role);
            return new ChatTokenResponse(token, userIdStr, apiKey);

        } catch (Exception e) {
            log.error("[stream-chat] Token generation failed: {}", e.getMessage());
            throw new RuntimeException("Stream Chat token generation failed", e);
        }
    }

    // -------------------------------------------------------------------------
    // CONSULT-003: Fetch recent patient messages for SOAP pre-population
    // -------------------------------------------------------------------------

    /**
     * Fetch the last {@code limit} messages sent by the patient in the
     * doctor-patient channel, optionally before a given timestamp.
     *
     * Returns a list of plain message texts (empty list in stub mode or on error).
     *
     * @param doctorId    the doctor's DB user ID
     * @param recipientId the patient's DB user ID
     * @param before      only return messages before this time (nullable — returns latest)
     * @param limit       max number of messages to return (1–25)
     */
    @SuppressWarnings("unchecked")
    public List<String> getRecentPatientMessages(Long doctorId, Long recipientId,
                                                  OffsetDateTime before, int limit) {
        if (STUB_API_KEY.equals(apiKey)) {
            log.info("[stream-chat] STUB — getRecentPatientMessages doctor={} patient={}", doctorId, recipientId);
            return List.of();
        }

        long lo = Math.min(doctorId, recipientId);
        long hi = Math.max(doctorId, recipientId);
        String channelId = lo + "__" + hi;

        try {
            String jwt = buildBotJwt();
            String url = STREAM_API + "/channels/messaging/" + channelId + "/messages"
                + "?limit=" + Math.min(limit, 25)
                + (before != null ? "&created_at_before=" + before.toInstant().toString() : "");

            Map<String, Object> response = restClient.get()
                .uri(url)
                .header("Authorization", jwt)
                .header("stream-auth-type", "jwt")
                .retrieve()
                .body(Map.class);

            List<String> texts = new ArrayList<>();
            if (response != null && response.get("messages") instanceof List<?> messages) {
                for (Object msg : messages) {
                    if (msg instanceof Map<?, ?> m) {
                        Object userId = m.get("user_id");
                        Object text   = m.get("text");
                        // Only include messages from the patient (recipient)
                        if (recipientId.toString().equals(String.valueOf(userId))
                                && text instanceof String t && !t.isBlank()) {
                            texts.add(t);
                        }
                    }
                }
            }
            return texts;
        } catch (Exception e) {
            log.warn("[stream-chat] getRecentPatientMessages failed: {}", e.getMessage());
            return List.of();
        }
    }

    private String buildBotJwt() {
        SecretKey key = Keys.hmacShaKeyFor(apiSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
            .claim("user_id", BOT_USER_ID)
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }
}
