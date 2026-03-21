package com.preventia.shared.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.BeanCreationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JJWT-based JWT provider.
 * Embeds the user's Role as a custom claim for downstream RBAC.
 * TODO: Rotate signing key via AWS Secrets Manager (ap-south-1) before prod.
 */
@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expirationMs;

    public JwtTokenProvider(
        @Value("${app.jwt.secret}") String secret,
        @Value("${app.jwt.expiration-ms:86400000}") long expirationMs
    ) {
        if (secret == null || secret.isBlank()) {
            throw new BeanCreationException("jwtTokenProvider",
                "JWT secret is missing. Set JWT_SECRET to a non-empty value that is at least 32 bytes long.");
        }

        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            throw new BeanCreationException("jwtTokenProvider",
                "JWT secret is too short for HS256. Set JWT_SECRET to at least 32 bytes. Current length: "
                    + secretBytes.length + " bytes.");
        }

        this.key = Keys.hmacShaKeyFor(secretBytes);
        this.expirationMs = expirationMs;
    }

    /**
     * Generate a signed JWT embedding the user's email (sub), role, and userId.
     * userId is required so the frontend can resolve the authenticated user's
     * database ID from the token without a round-trip to /api/v1/auth/me.
     */
    public String generateToken(Authentication auth, String role, Long userId) {
        Date now = new Date();
        return Jwts.builder()
            .subject(auth.getName())
            .claim("role", role)
            .claim("userId", userId)
            .issuedAt(now)
            .expiration(new Date(now.getTime() + expirationMs))
            .signWith(key)
            .compact();
    }

    public String getUserEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public String getRole(String token) {
        return (String) parseClaims(token).get("role");
    }

    public Long getUserId(String token) {
        Object raw = parseClaims(token).get("userId");
        if (raw instanceof Number n) return n.longValue();
        return null;
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public long getExpirationSeconds() {
        return expirationMs / 1000;
    }

    private Claims parseClaims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
