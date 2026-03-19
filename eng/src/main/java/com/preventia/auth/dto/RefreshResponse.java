package com.preventia.auth.dto;

/**
 * Response body for POST /api/v1/auth/refresh.
 *
 * Returns a fresh access token + rotated refresh token.
 * tokenType is always "Bearer" per RFC 6750.
 */
public record RefreshResponse(
    String accessToken,
    String tokenType,
    long   expiresInSeconds,
    String role,
    String refreshToken
) {
    public RefreshResponse(String accessToken, long expiresInSeconds, String role, String refreshToken) {
        this(accessToken, "Bearer", expiresInSeconds, role, refreshToken);
    }
}
