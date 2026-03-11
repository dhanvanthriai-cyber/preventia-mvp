package com.dhanvanthri.pharmacy.domain;

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

    // Getters/Setters — add Lombok in next pass
}
