package com.preventia.pharmacy.controller;

import com.preventia.pharmacy.domain.Medication;
import com.preventia.pharmacy.dto.InventoryAlertSummary;
import com.preventia.pharmacy.dto.InventoryUpdateRequest;
import com.preventia.pharmacy.dto.MedicationResponse;
import com.preventia.pharmacy.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pharmacy")
public class PharmacyController {

    private final InventoryService inventoryService;

    public PharmacyController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    /**
     * Update inventory quantity.
     * ?force=true bypasses the 50% drastic change guard (requires explicit user confirmation).
     */
    @PatchMapping("/inventory")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'RECIPIENT', 'SPONSOR')")
    public Medication updateInventory(
        @Valid @RequestBody InventoryUpdateRequest request,
        @RequestParam(defaultValue = "false") boolean force
    ) {
        return inventoryService.updateInventory(request, force);
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/patients/{patientId}/medications/alerts
    // -------------------------------------------------------------------------

    /**
     * Returns a refill alert summary for a patient.
     *
     * Accessible to SPONSOR (NRI family member), DOCTOR, and PHARMACIST.
     * Includes counts of WARNING (4–7 days) and CRITICAL (≤ 3 days) medications.
     *
     * @param patientId DB ID of the target patient
     * @return {@link InventoryAlertSummary} with warningCount and criticalCount
     */
    @GetMapping("/api/v1/patients/{patientId}/medications/alerts")
    @PreAuthorize("hasAnyRole('SPONSOR','DOCTOR','PHARMACIST')")
    public InventoryAlertSummary getMedicationAlerts(@PathVariable Long patientId) {
        return inventoryService.getAlertSummary(patientId);
    }
}
