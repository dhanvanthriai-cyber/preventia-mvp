package com.dhanvanthri.lab.dto;

import com.dhanvanthri.lab.domain.LabOrder;
import com.dhanvanthri.lab.domain.LabOrderStatus;
import com.dhanvanthri.lab.domain.LabPartnerCode;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Response DTO for lab order endpoints.
 * Maps from {@link LabOrder} entity.
 */
public record LabOrderResponse(
    Long id,
    Long appointmentId,
    Long patientId,
    LabPartnerCode labPartner,
    String testCode,
    String testName,
    String externalOrderId,
    String trackingId,
    LabOrderStatus status,
    boolean requiresColdChain,
    BigDecimal lastTempReading,
    Instant tempLoggedAt,
    boolean coldChainBreached,
    String resultPdfKey,
    Instant createdAt,
    Instant updatedAt
) {

    /** Factory method — maps entity to response record. */
    public static LabOrderResponse from(LabOrder order) {
        return new LabOrderResponse(
            order.getId(),
            order.getAppointmentId(),
            order.getPatientId(),
            order.getLabPartner(),
            order.getTestCode(),
            order.getTestName(),
            order.getExternalOrderId(),
            order.getTrackingId(),
            order.getStatus(),
            order.isRequiresColdChain(),
            order.getLastTempReading(),
            order.getTempLoggedAt(),
            order.isColdChainBreached(),
            order.getResultPdfKey(),
            order.getCreatedAt(),
            order.getUpdatedAt()
        );
    }
}
