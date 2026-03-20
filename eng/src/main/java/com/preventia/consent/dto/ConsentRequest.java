package com.preventia.consent.dto;

/**
 * Request body for {@code POST /api/v1/consent}.
 */
public record ConsentRequest(
    Long    appointmentId,
    boolean recordingConsent
) {}
