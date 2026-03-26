package com.preventia.care.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for POST /api/v1/care-plans.
 * frequency: DAILY | WEEKLY | MONTHLY (default WEEKLY)
 */
public record CarePlanRequest(
    @NotNull Long patientId,
    Long appointmentId,
    @NotBlank String question,
    String frequency   // DAILY | WEEKLY | MONTHLY
) {}
