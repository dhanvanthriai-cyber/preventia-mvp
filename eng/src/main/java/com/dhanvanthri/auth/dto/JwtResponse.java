package com.dhanvanthri.auth.dto;

/**
 * JWT response returned after successful authentication (login or register).
 *
 * tokenType    — always "Bearer" per RFC 6750
 * refreshToken — opaque UUID string; present on login/register, used to
 *                obtain a new access token via POST /api/v1/auth/refresh
 */
public record JwtResponse(
    String accessToken,
    String tokenType,
    long   expiresInSeconds,
    String role,
    String refreshToken
) {
    /** Full constructor — primary entry point. */
    public JwtResponse(String accessToken, long expiresInSeconds, String role, String refreshToken) {
        this(accessToken, "Bearer", expiresInSeconds, role, refreshToken);
    }

    /**
     * Backward-compatible constructor for call sites that don't yet have a
     * refresh token (e.g. internal tests, legacy stubs).
     * refreshToken will be null in the JSON response.
     */
    public JwtResponse(String accessToken, long expiresInSeconds, String role) {
        this(accessToken, "Bearer", expiresInSeconds, role, null);
    }
}
