package com.dhanvanthri.lab.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * JPA entity representing a diagnostic lab order.
 *
 * Maps to the {@code lab_orders} table (created by V3__lab_orders.sql).
 * Supports cold chain temperature tracking for temperature-sensitive samples.
 *
 * Integration:
 *   - Primary: Thyrocare REST API (see {@link com.dhanvanthri.lab.service.ThyrocareApiService})
 *   - Webhook: {@code /api/v1/webhook/lab} updates status on sample_collected / results_ready
 */
@Entity
@Table(name = "lab_orders")
public class LabOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // -------------------------------------------------------------------------
    // Relational links
    // -------------------------------------------------------------------------

    @Column(name = "appointment_id", nullable = false)
    private Long appointmentId;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    // -------------------------------------------------------------------------
    // Lab partner identity
    // -------------------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(name = "lab_partner", nullable = false, columnDefinition = "varchar(50)")
    private LabPartnerCode labPartner = LabPartnerCode.THYROCARE;

    /** LOINC code preferred; proprietary code as fallback. */
    @Column(name = "test_code", nullable = false, length = 100)
    private String testCode;

    /** Human-readable label for display purposes. */
    @Column(name = "test_name", length = 255)
    private String testName;

    // -------------------------------------------------------------------------
    // External lab system references (populated after API call)
    // -------------------------------------------------------------------------

    /** Order ID returned by lab partner API (e.g., Thyrocare POST /api/order). */
    @Column(name = "external_order_id", length = 255)
    private String externalOrderId;

    /** Lab's trackingId for real-time sample tracking. */
    @Column(name = "tracking_id", length = 255)
    private String trackingId;

    // -------------------------------------------------------------------------
    // Order lifecycle
    // -------------------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "varchar(20)")
    private LabOrderStatus status = LabOrderStatus.ORDERED;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Column(name = "collected_at")
    private Instant collectedAt;

    @Column(name = "resulted_at")
    private Instant resultedAt;

    // -------------------------------------------------------------------------
    // Cold chain tracking
    // -------------------------------------------------------------------------

    @Column(name = "requires_cold_chain", nullable = false)
    private boolean requiresColdChain = false;

    /** Most recent temperature reading in °C (2 decimal places). */
    @Column(name = "last_temp_reading", precision = 5, scale = 2)
    private BigDecimal lastTempReading;

    /** Timestamp of the last temperature reading. */
    @Column(name = "temp_logged_at")
    private Instant tempLoggedAt;

    /** Set TRUE if temperature exceeded the safe range (>8°C for cold chain). */
    @Column(name = "cold_chain_breached", nullable = false)
    private boolean coldChainBreached = false;

    // -------------------------------------------------------------------------
    // Result storage
    // -------------------------------------------------------------------------

    /**
     * S3 object key for the lab report PDF.
     * Format: {@code lab-reports/{patientId}/{externalOrderId}.pdf}
     * Null until status = RESULTED.
     */
    @Column(name = "result_pdf_key", length = 500)
    private String resultPdfKey;

    // -------------------------------------------------------------------------
    // Metadata
    // -------------------------------------------------------------------------

    @Column(name = "collection_address", columnDefinition = "TEXT")
    private String collectionAddress;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    // -------------------------------------------------------------------------
    // JPA lifecycle
    // -------------------------------------------------------------------------

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // -------------------------------------------------------------------------
    // Getters & Setters
    // -------------------------------------------------------------------------

    public Long getId() { return id; }

    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long appointmentId) { this.appointmentId = appointmentId; }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }

    public LabPartnerCode getLabPartner() { return labPartner; }
    public void setLabPartner(LabPartnerCode labPartner) { this.labPartner = labPartner; }

    public String getTestCode() { return testCode; }
    public void setTestCode(String testCode) { this.testCode = testCode; }

    public String getTestName() { return testName; }
    public void setTestName(String testName) { this.testName = testName; }

    public String getExternalOrderId() { return externalOrderId; }
    public void setExternalOrderId(String externalOrderId) { this.externalOrderId = externalOrderId; }

    public String getTrackingId() { return trackingId; }
    public void setTrackingId(String trackingId) { this.trackingId = trackingId; }

    public LabOrderStatus getStatus() { return status; }
    public void setStatus(LabOrderStatus status) { this.status = status; }

    public Instant getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(Instant scheduledAt) { this.scheduledAt = scheduledAt; }

    public Instant getCollectedAt() { return collectedAt; }
    public void setCollectedAt(Instant collectedAt) { this.collectedAt = collectedAt; }

    public Instant getResultedAt() { return resultedAt; }
    public void setResultedAt(Instant resultedAt) { this.resultedAt = resultedAt; }

    public boolean isRequiresColdChain() { return requiresColdChain; }
    public void setRequiresColdChain(boolean requiresColdChain) { this.requiresColdChain = requiresColdChain; }

    public BigDecimal getLastTempReading() { return lastTempReading; }
    public void setLastTempReading(BigDecimal lastTempReading) { this.lastTempReading = lastTempReading; }

    public Instant getTempLoggedAt() { return tempLoggedAt; }
    public void setTempLoggedAt(Instant tempLoggedAt) { this.tempLoggedAt = tempLoggedAt; }

    public boolean isColdChainBreached() { return coldChainBreached; }
    public void setColdChainBreached(boolean coldChainBreached) { this.coldChainBreached = coldChainBreached; }

    public String getResultPdfKey() { return resultPdfKey; }
    public void setResultPdfKey(String resultPdfKey) { this.resultPdfKey = resultPdfKey; }

    public String getCollectionAddress() { return collectionAddress; }
    public void setCollectionAddress(String collectionAddress) { this.collectionAddress = collectionAddress; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Instant getCreatedAt() { return createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
