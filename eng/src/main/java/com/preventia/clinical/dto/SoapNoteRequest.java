package com.preventia.clinical.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Inbound DTO for creating a SOAP note during a virtual session.
 * sessionToken is mandatory — enforces the Safety Rail that EMR writes
 * are locked to the duration of the scheduled virtual consultation.
 */
public record SoapNoteRequest(
    @NotNull Long patientId,
    @NotNull Long doctorId,
    String subjective,
    String objective,
    String assessment,
    String plan,
    @NotNull String sessionToken,
    String prescriptionS3Key
) {}
