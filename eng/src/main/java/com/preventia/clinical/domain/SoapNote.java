package com.preventia.clinical.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * SOAP-structured clinical note. Schema is FHIR R4 / ABDM-aligned.
 * Maps to: FHIR Composition resource (type = clinical-note).
 *
 * EMR write-access is token-locked to the duration of the virtual session (NFR §7).
 * The sessionToken field records the Daily.co session ID that authorized this write.
 */
@Entity
@Table(name = "soap_notes")
public class SoapNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FK to appointments.id — nullable (note may be detached from appointment). */
    @Column(name = "appointment_id")
    private Long appointmentId;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    /** S — Subjective: patient-reported symptoms. */
    @Column(columnDefinition = "TEXT")
    private String subjective;

    /** O — Objective: vitals, exam findings, lab results. */
    @Column(columnDefinition = "TEXT")
    private String objective;

    /** A — Assessment: differential diagnosis and clinical reasoning. */
    @Column(columnDefinition = "TEXT")
    private String assessment;

    /** P — Plan: prescriptions, referrals, follow-up cadence. */
    @Column(columnDefinition = "TEXT")
    private String plan;

    /** Daily.co session ID that authorized this EMR write (Safety Rail §7). */
    @Column(name = "session_token")
    private String sessionToken;

    /** S3 key for the primary/first uploaded Prescription PDF (backward-compat canonical key). */
    @Column(name = "prescription_s3_key")
    private String prescriptionS3Key;

    /**
     * All S3 keys for this prescription's uploaded files, in upload order.
     * Index 0 always mirrors {@code prescriptionS3Key}.
     * Populated by V14__prescription_multi_file.sql.
     */
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "prescription_s3_keys", columnDefinition = "TEXT[]")
    private List<String> prescriptionS3Keys = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // ── Getters ──────────────────────────────────────────────────────────────
    public Long getId()                  { return id; }
    public Long getAppointmentId()       { return appointmentId; }
    public Long getPatientId()           { return patientId; }
    public Long getDoctorId()            { return doctorId; }
    public String getSubjective()        { return subjective; }
    public String getObjective()         { return objective; }
    public String getAssessment()        { return assessment; }
    public String getPlan()              { return plan; }
    public String getSessionToken()      { return sessionToken; }
    public String getPrescriptionS3Key()       { return prescriptionS3Key; }
    public List<String> getPrescriptionS3Keys() { return prescriptionS3Keys; }
    public Instant getCreatedAt()              { return createdAt; }

    // ── Setters ──────────────────────────────────────────────────────────────
    public void setAppointmentId(Long appointmentId)                 { this.appointmentId = appointmentId; }
    public void setPatientId(Long patientId)                         { this.patientId = patientId; }
    public void setDoctorId(Long doctorId)                           { this.doctorId = doctorId; }
    public void setSubjective(String subjective)                     { this.subjective = subjective; }
    public void setObjective(String objective)                       { this.objective = objective; }
    public void setAssessment(String assessment)                     { this.assessment = assessment; }
    public void setPlan(String plan)                                 { this.plan = plan; }
    public void setSessionToken(String sessionToken)                 { this.sessionToken = sessionToken; }
    public void setPrescriptionS3Key(String prescriptionS3Key)       { this.prescriptionS3Key = prescriptionS3Key; }
    public void setPrescriptionS3Keys(List<String> keys)             { this.prescriptionS3Keys = keys != null ? keys : new ArrayList<>(); }
}
