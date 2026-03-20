package com.preventia.consent.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

/**
 * JPA entity mapping the {@code consent_records} table.
 *
 * One row per consent action — a user can consent multiple times
 * (e.g. for different appointments). Uniqueness is checked at service level.
 */
@Entity
@Table(name = "consent_records")
public class ConsentRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    /** FK → users.id — the user who gave consent */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** FK → appointments.id — nullable (may be given pre-appointment) */
    @Column(name = "appointment_id")
    private Long appointmentId;

    /** Type tag, default TELECONSULT */
    @Column(name = "consent_type", nullable = false, length = 30)
    private String consentType = "TELECONSULT";

    /** Whether the user consented to session recording */
    @Column(name = "recording_consent", nullable = false)
    private boolean recordingConsent = false;

    /** Timestamp of consent */
    @Column(name = "consented_at", nullable = false)
    private OffsetDateTime consentedAt = OffsetDateTime.now();

    /** Client IP address (IPv4 or IPv6) */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /** User-Agent header from the consent HTTP request */
    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    protected ConsentRecord() {}

    public ConsentRecord(Long userId, Long appointmentId, boolean recordingConsent,
                         String ipAddress, String userAgent) {
        this.userId           = userId;
        this.appointmentId    = appointmentId;
        this.recordingConsent = recordingConsent;
        this.ipAddress        = ipAddress;
        this.userAgent        = userAgent;
        this.consentedAt      = OffsetDateTime.now();
    }

    // Getters
    public Long getId()                  { return id; }
    public Long getUserId()              { return userId; }
    public Long getAppointmentId()       { return appointmentId; }
    public String getConsentType()       { return consentType; }
    public boolean isRecordingConsent()  { return recordingConsent; }
    public OffsetDateTime getConsentedAt() { return consentedAt; }
    public String getIpAddress()         { return ipAddress; }
    public String getUserAgent()         { return userAgent; }
}
