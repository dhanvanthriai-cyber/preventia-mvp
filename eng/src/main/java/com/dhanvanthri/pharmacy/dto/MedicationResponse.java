package com.dhanvanthri.pharmacy.dto;

import com.dhanvanthri.pharmacy.domain.Medication;
import com.dhanvanthri.pharmacy.domain.RefillUrgency;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Response DTO for medication endpoints.
 * Includes computed refill intelligence fields derived from the entity.
 */
public record MedicationResponse(
    Long id,
    Long patientId,
    String drugName,
    int totalQuantity,
    int dailyDosage,
    BigDecimal unitPriceInr,
    int daysRemaining,
    boolean isRefillRequired,
    RefillUrgency refillUrgency,
    Instant updatedAt,
    Instant createdAt
) {

    /** Factory method — maps entity to response record. */
    public static MedicationResponse from(Medication med) {
        return new MedicationResponse(
            med.getId(),
            med.getPatientId(),
            med.getDrugName(),
            med.getTotalQuantity(),
            med.getDailyDosage(),
            med.getUnitPriceInr(),
            med.getDaysRemaining(),
            med.isRefillRequired(),
            med.getRefillUrgency(),
            med.getUpdatedAt(),
            med.getCreatedAt()
        );
    }
}
