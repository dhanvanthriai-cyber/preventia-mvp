package com.dhanvanthri.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for POST /api/v1/auth/refresh.
 */
public record RefreshRequest(
    @NotBlank(message = "refreshToken is required")
    String refreshToken
) {}
