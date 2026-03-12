package com.dhanvanthri.lab.dto;

import com.dhanvanthri.lab.domain.LabPartnerCode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for POST /api/v1/lab-orders.
 * DOCTOR role only.
 */
public record CreateLabOrderRequest(

    @NotNull(message = "appointmentId is required")
    Long appointmentId,

    @NotNull(message = "patientId is required")
    Long patientId,

    @NotNull(message = "labPartner is required")
    LabPartnerCode labPartner,

    @NotBlank(message = "testCode is required")
    String testCode,

    String testName,

    boolean requiresColdChain,

    String collectionAddress,

    String notes
) {}
