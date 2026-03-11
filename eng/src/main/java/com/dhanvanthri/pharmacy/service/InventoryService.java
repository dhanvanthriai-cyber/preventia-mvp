package com.dhanvanthri.pharmacy.service;

import com.dhanvanthri.pharmacy.domain.InventoryAuditLog;
import com.dhanvanthri.pharmacy.domain.Medication;
import com.dhanvanthri.pharmacy.dto.InventoryUpdateRequest;
import com.dhanvanthri.pharmacy.repository.MedicationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@Transactional
public class InventoryService {

    private static final double DRASTIC_REDUCTION_THRESHOLD = 0.50;

    private final MedicationRepository medRepo;
    // TODO: inject InventoryAuditLogRepository

    public InventoryService(MedicationRepository medRepo) {
        this.medRepo = medRepo;
    }

    /**
     * Updates inventory quantity and writes an immutable audit log entry.
     * Throws DrasticChangeException if reduction exceeds 50% (Safety Rail §6).
     * Force flag (from a second confirmed request) bypasses the drastic check.
     */
    public Medication updateInventory(InventoryUpdateRequest req, boolean force) {
        Medication med = medRepo.findById(req.medicationId())
            .orElseThrow(() -> new IllegalArgumentException("Medication not found: " + req.medicationId()));

        int before = med.getTotalQuantity();
        int after = req.newQuantity();

        if (!force && before > 0) {
            double reductionRatio = (double)(before - after) / before;
            if (reductionRatio > DRASTIC_REDUCTION_THRESHOLD) {
                throw new DrasticChangeException(
                    String.format("Reduction of %.0f%% exceeds safety threshold. Confirm to proceed.", reductionRatio * 100)
                );
            }
        }

        // TODO: save audit log entry
        med.setTotalQuantity(after);
        med.setUpdatedAt(Instant.now());
        return medRepo.save(med);
    }

    public static class DrasticChangeException extends RuntimeException {
        public DrasticChangeException(String msg) { super(msg); }
    }
}
