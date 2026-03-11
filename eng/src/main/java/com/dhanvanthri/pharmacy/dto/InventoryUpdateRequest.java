package com.dhanvanthri.pharmacy.dto;

import com.dhanvanthri.pharmacy.domain.InventoryAuditLog.AuditSource;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request to update medication quantity.
 * If (oldQty - newQuantity) / oldQty > 0.50, the service will throw
 * DrasticChangeException which the frontend must confirm before retrying.
 */
public record InventoryUpdateRequest(
    @NotNull Long medicationId,
    @Min(0) int newQuantity,
    @NotNull AuditSource source,
    Long actorId,
    String note
) {}
