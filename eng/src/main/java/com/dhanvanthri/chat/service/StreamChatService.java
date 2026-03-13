package com.dhanvanthri.chat.service;

import com.dhanvanthri.chat.dto.ChatTokenResponse;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

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

    @Value("${stream.api-key:STUB_KEY}")
    private String apiKey;

    @Value("${stream.api-secret:STUB_SECRET}")
    private String apiSecret;

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
}
