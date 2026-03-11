package com.dhanvanthri.family.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Tri-Party Validation link: Sponsor (NRI) → Recipient (Patient in India).
 * consent_status controls whether the Sponsor can read/act on the Recipient's EMR.
 * PENDING  → invite sent, not yet accepted.
 * GRANTED  → patient confirmed access; Sponsor gets read-only EMR view.
 * REVOKED  → patient withdrew consent; all Sponsor EMR access immediately invalidated.
 */
@Entity
@Table(name = "family_relationships")
public class FamilyRelationship {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sponsor_id", nullable = false)
    private User sponsor;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(name = "consent_status", nullable = false)
    private ConsentStatus consentStatus = ConsentStatus.PENDING;

    @Column(name = "granted_at")
    private Instant grantedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public enum ConsentStatus {
        PENDING, GRANTED, REVOKED
    }

    // --- Getters / Setters ---

    public Long getId() { return id; }
    public User getSponsor() { return sponsor; }
    public void setSponsor(User sponsor) { this.sponsor = sponsor; }
    public User getRecipient() { return recipient; }
    public void setRecipient(User recipient) { this.recipient = recipient; }
    public ConsentStatus getConsentStatus() { return consentStatus; }
    public void setConsentStatus(ConsentStatus consentStatus) { this.consentStatus = consentStatus; }
    public Instant getGrantedAt() { return grantedAt; }
    public void setGrantedAt(Instant grantedAt) { this.grantedAt = grantedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
