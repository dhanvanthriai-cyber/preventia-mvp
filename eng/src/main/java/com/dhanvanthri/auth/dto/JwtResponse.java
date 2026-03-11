package com.dhanvanthri.auth.dto;

/**
 * JWT response returned after successful authentication.
 * tokenType is always "Bearer" per RFC 6750.
 */
public record JwtResponse(
    String accessToken,
    String tokenType,
    long expiresInSeconds,
    String role
) {
    public JwtResponse(String accessToken, long expiresInSeconds, String role) {
        this(accessToken, "Bearer", expiresInSeconds, role);
    }
}
