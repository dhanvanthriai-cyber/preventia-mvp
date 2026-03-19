package com.preventia.pharmacy.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Represents a medication item in a Patient's active inventory.
 * Days remaining is computed: floor(totalQuantity / dailyDosage).
 * When daysRemaining <= 7: triggers "Refill Required" alert (Safety Rail §3).
 */
@Entity
@Table(name = "medications")
public class Medication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "drug_name", nullable = false)
    private String drugName;

    @Column(name = "total_quantity", nullable = false)
    private int totalQuantity;

    @Column(name = "daily_dosage", nullable = false)
    private int dailyDosage;

    /** Price in INR — used by Razorpay refill flow. */
    @Column(name = "unit_price_inr", precision = 10, scale = 2)
    private BigDecimal unitPriceInr;

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    /** Computed field — not persisted. */
    @Transient
    public int getDaysRemaining() {
        return dailyDosage > 0 ? totalQuantity / dailyDosage : Integer.MAX_VALUE;
    }

    @Transient
    public boolean isRefillRequired() {
        return getDaysRemaining() <= 7;
    }

    /**
     * Classifies refill urgency based on days remaining.
     * CRITICAL: ≤ 3 days | WARNING: ≤ 7 days | OK: > 7 days
     */
    @Transient
    public RefillUrgency getRefillUrgency() {
        int days = getDaysRemaining();
        if (days <= 3) return RefillUrgency.CRITICAL;
        if (days <= 7) return RefillUrgency.WARNING;
        return RefillUrgency.OK;
    }

    // -------------------------------------------------------------------------
    // Getters / Setters
    // -------------------------------------------------------------------------

    public Long getId() { return id; }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }

    public String getDrugName() { return drugName; }
    public void setDrugName(String drugName) { this.drugName = drugName; }

    public int getTotalQuantity() { return totalQuantity; }
    public void setTotalQuantity(int totalQuantity) { this.totalQuantity = totalQuantity; }

    public int getDailyDosage() { return dailyDosage; }
    public void setDailyDosage(int dailyDosage) { this.dailyDosage = dailyDosage; }

    public BigDecimal getUnitPriceInr() { return unitPriceInr; }
    public void setUnitPriceInr(BigDecimal unitPriceInr) { this.unitPriceInr = unitPriceInr; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Instant getCreatedAt() { return createdAt; }
}
