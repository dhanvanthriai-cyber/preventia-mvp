package com.preventia.care.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * A recurring check-in question sent by a doctor to a patient on a schedule.
 * Maps to: care_plans table (V26 migration).
 *
 * Frequency values: DAILY | WEEKLY | MONTHLY
 */
@Entity
@Table(name = "care_plans")
public class CarePlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    @Column(name = "appointment_id")
    private Long appointmentId;

    @Column(name = "question", nullable = false, columnDefinition = "TEXT")
    private String question;

    @Column(name = "frequency", nullable = false, length = 20)
    private String frequency; // DAILY | WEEKLY | MONTHLY

    @Column(name = "next_send_at", nullable = false)
    private Instant nextSendAt;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "missed_count", nullable = false)
    private int missedCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected CarePlan() {}

    public CarePlan(Long patientId, Long doctorId, Long appointmentId,
                    String question, String frequency, Instant nextSendAt) {
        this.patientId     = patientId;
        this.doctorId      = doctorId;
        this.appointmentId = appointmentId;
        this.question      = question;
        this.frequency     = frequency == null ? "WEEKLY" : frequency.toUpperCase();
        this.nextSendAt    = nextSendAt;
        this.createdAt     = Instant.now();
    }

    public Long    getId()            { return id; }
    public Long    getPatientId()     { return patientId; }
    public Long    getDoctorId()      { return doctorId; }
    public Long    getAppointmentId() { return appointmentId; }
    public String  getQuestion()      { return question; }
    public String  getFrequency()     { return frequency; }
    public Instant getNextSendAt()    { return nextSendAt; }
    public boolean isActive()         { return active; }
    public int     getMissedCount()   { return missedCount; }
    public Instant getCreatedAt()     { return createdAt; }

    public void setNextSendAt(Instant nextSendAt) { this.nextSendAt = nextSendAt; }
    public void setActive(boolean active)          { this.active = active; }
    public void setMissedCount(int missedCount)    { this.missedCount = missedCount; }
}
