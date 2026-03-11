package com.dhanvanthri.pharmacy.controller;

import com.dhanvanthri.pharmacy.domain.Medication;
import com.dhanvanthri.pharmacy.dto.InventoryUpdateRequest;
import com.dhanvanthri.pharmacy.service.InventoryService;
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
    @PreAuthorize("hasAnyRole('PHARMACY', 'PATIENT', 'SPONSOR')")
    public Medication updateInventory(
        @Valid @RequestBody InventoryUpdateRequest request,
        @RequestParam(defaultValue = "false") boolean force
    ) {
        return inventoryService.updateInventory(request, force);
    }
}
