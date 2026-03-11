package com.dhanvanthri.pharmacy.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Immutable audit trail for every inventory change.
 * Source tracks WHO made the change per PRD §5 (Inventory Audit).
 * If a single update reduces quantity by >50%, a verification prompt is triggered
 * before committing (Safety Rail §6 — Drastic Change Alert).
 */
@Entity
@Table(name = "inventory_audit_log")
public class InventoryAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "medication_id", nullable = false)
    private Long medicationId;

    @Column(name = "quantity_before", nullable = false)
    private int quantityBefore;

    @Column(name = "quantity_after", nullable = false)
    private int quantityAfter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditSource source;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "note")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public enum AuditSource {
        /** Automated system action (e.g., scheduled dispensing). */
        SYSTEM,
        /** Sahayak (care assistant) performed a physical count. */
        SAHAYAK,
        /** Patient or Sponsor manually updated the count. */
        USER
    }

    // Getters/Setters — add Lombok in next pass
}
