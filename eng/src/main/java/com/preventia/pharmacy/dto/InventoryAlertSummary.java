package com.preventia.pharmacy.dto;

/**
 * Summary of inventory alerts for a given patient.
 *
 * Returned by GET /api/v1/patients/{patientId}/medications/alerts.
 *
 * @param patientId     patient the summary belongs to
 * @param warningCount  medications with 4–7 days remaining
 * @param criticalCount medications with ≤ 3 days remaining
 */
public record InventoryAlertSummary(
    Long patientId,
    int warningCount,
    int criticalCount
) {}
