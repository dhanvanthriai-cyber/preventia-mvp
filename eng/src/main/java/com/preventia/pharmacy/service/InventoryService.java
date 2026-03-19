package com.preventia.pharmacy.service;

import com.preventia.pharmacy.domain.InventoryAuditLog;
import com.preventia.pharmacy.domain.Medication;
import com.preventia.pharmacy.domain.RefillUrgency;
import com.preventia.pharmacy.dto.InventoryAlertSummary;
import com.preventia.pharmacy.dto.InventoryUpdateRequest;
import com.preventia.pharmacy.repository.InventoryAuditLogRepository;
import com.preventia.pharmacy.repository.MedicationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional
public class InventoryService {

    private static final double DRASTIC_REDUCTION_THRESHOLD = 0.50;

    private final MedicationRepository medRepo;
    private final InventoryAuditLogRepository auditLogRepository;

    public InventoryService(MedicationRepository medRepo,
                            InventoryAuditLogRepository auditLogRepository) {
        this.medRepo = medRepo;
        this.auditLogRepository = auditLogRepository;
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

        InventoryAuditLog auditLog = new InventoryAuditLog();
        auditLog.setMedicationId(med.getId());
        auditLog.setQuantityBefore(before);
        auditLog.setQuantityAfter(after);
        auditLog.setSource(req.source());
        auditLog.setActorId(req.actorId());
        auditLog.setNote(req.note());
        auditLogRepository.save(auditLog);

        med.setTotalQuantity(after);
        med.setUpdatedAt(Instant.now());
        return medRepo.save(med);
    }

    // -------------------------------------------------------------------------
    // Refill / alert queries
    // -------------------------------------------------------------------------

    /**
     * Returns all medications for a patient that require a refill
     * (daysRemaining ≤ 7, per Safety Rail §3).
     *
     * Uses the repository's JPQL query rather than in-memory filtering so
     * the DB can apply the index on patient_id.
     *
     * @param patientId target patient
     * @return list of low-stock medications (may be empty)
     */
    @Transactional(readOnly = true)
    public List<Medication> getLowStockMedications(Long patientId) {
        return medRepo.findLowStockByPatient(patientId, 7)
                .stream()
                .filter(Medication::isRefillRequired)
                .toList();
    }

    /**
     * Aggregates WARNING and CRITICAL refill counts for a patient's dashboard.
     *
     * @param patientId target patient
     * @return {@link InventoryAlertSummary} with warningCount and criticalCount
     */
    @Transactional(readOnly = true)
    public InventoryAlertSummary getAlertSummary(Long patientId) {
        List<Medication> lowStock = getLowStockMedications(patientId);

        int warningCount  = (int) lowStock.stream()
                .filter(m -> m.getRefillUrgency() == RefillUrgency.WARNING)
                .count();
        int criticalCount = (int) lowStock.stream()
                .filter(m -> m.getRefillUrgency() == RefillUrgency.CRITICAL)
                .count();

        return new InventoryAlertSummary(patientId, warningCount, criticalCount);
    }

    public static class DrasticChangeException extends RuntimeException {
        public DrasticChangeException(String msg) { super(msg); }
    }
}
