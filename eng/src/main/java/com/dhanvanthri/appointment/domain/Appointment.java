package com.dhanvanthri.appointment.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

/**
 * JPA entity representing a teleconsultation appointment.
 *
 * Table: appointments
 *
 * Key relationships:
 *  - recipientId  → users.id  (the patient / elderly parent in India)
 *  - sponsorId    → users.id  (nullable: the NRI child observer)
 *  - doctorId     → users.id  (the attending physician)
 *
 * Daily.co integration:
 *  - dailyRoomUrl  — full HTTPS URL given to participants
 *  - dailyRoomName — short identifier used for webhook event matching
 */
@Entity
@Table(name = "appointments")
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)   // maps to BIGSERIAL in PostgreSQL
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    /** The patient / recipient of care (parent in India). */
    @Column(name = "recipient_id", nullable = false)
    private Long recipientId;

    /** Optional NRI child who observes the session remotely. */
    @Column(name = "sponsor_id", nullable = true)
    private Long sponsorId;

    /** Attending doctor for this appointment. */
    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    /** Scheduled start of the session (timezone-aware). */
    @Column(name = "start_time", nullable = false)
    private OffsetDateTime startTime;

    /** Scheduled end of the session (timezone-aware). */
    @Column(name = "end_time", nullable = false)
    private OffsetDateTime endTime;

    /** Full Daily.co room URL shared with participants (max 500 chars). */
    @Column(name = "daily_room_url", nullable = false, length = 500)
    private String dailyRoomUrl;

    /** Short Daily.co room name used to match incoming webhook events. */
    @Column(name = "daily_room_name", nullable = false, length = 255)
    private String dailyRoomName;

    /** Current lifecycle state — drives EMR write-access gating. */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private AppointmentStatus status;

    /** Timestamp set automatically at INSERT; never updated. */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    // -------------------------------------------------------------------------
    // Constructors
    // -------------------------------------------------------------------------

    protected Appointment() {
        // JPA no-arg constructor
    }

    public Appointment(Long recipientId, Long sponsorId, Long doctorId,
                       OffsetDateTime startTime, OffsetDateTime endTime,
                       String dailyRoomUrl, String dailyRoomName) {
        this.recipientId  = recipientId;
        this.sponsorId    = sponsorId;
        this.doctorId     = doctorId;
        this.startTime    = startTime;
        this.endTime      = endTime;
        this.dailyRoomUrl = dailyRoomUrl;
        this.dailyRoomName = dailyRoomName;
        this.status       = AppointmentStatus.SCHEDULED;
    }

    // -------------------------------------------------------------------------
    // Getters & Setters
    // -------------------------------------------------------------------------

    public Long getId()                       { return id; }
    public Long getRecipientId()              { return recipientId; }
    public Long getSponsorId()                { return sponsorId; }
    public Long getDoctorId()                 { return doctorId; }
    public OffsetDateTime getStartTime()      { return startTime; }
    public OffsetDateTime getEndTime()        { return endTime; }
    public String getDailyRoomUrl()           { return dailyRoomUrl; }
    public String getDailyRoomName()          { return dailyRoomName; }
    public AppointmentStatus getStatus()      { return status; }
    public OffsetDateTime getCreatedAt()      { return createdAt; }

    public void setStatus(AppointmentStatus status) { this.status = status; }
    public void setSponsorId(Long sponsorId)        { this.sponsorId = sponsorId; }
}
