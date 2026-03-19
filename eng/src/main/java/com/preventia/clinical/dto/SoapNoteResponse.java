package com.preventia.clinical.dto;

import java.time.Instant;

/**
 * Outbound DTO returned after a SOAP note is successfully created or fetched.
 */
public record SoapNoteResponse(
        Long id,
        Long patientId,
        Long doctorId,
        String subjective,
        String objective,
        String assessment,
        String plan,
        String sessionToken,
        String prescriptionS3Key,
        Instant createdAt
) {}
