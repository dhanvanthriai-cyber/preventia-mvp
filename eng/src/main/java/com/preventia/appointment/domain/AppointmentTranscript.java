package com.preventia.appointment.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Stores Daily.co cloud recording URL and optional transcript text for a consultation.
 * Created on receipt of the recording-ready webhook from Daily.co.
 * Maps to: appointment_transcripts table (V25 migration).
 */
@Entity
@Table(name = "appointment_transcripts")
public class AppointmentTranscript {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "appointment_id", nullable = false)
    private Long appointmentId;

    @Column(name = "recording_url", columnDefinition = "TEXT")
    private String recordingUrl;

    @Column(name = "transcript_text", columnDefinition = "TEXT")
    private String transcriptText;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AppointmentTranscript() {}

    public AppointmentTranscript(Long appointmentId, String recordingUrl) {
        this.appointmentId = appointmentId;
        this.recordingUrl  = recordingUrl;
        this.createdAt     = Instant.now();
    }

    public Long    getId()             { return id; }
    public Long    getAppointmentId()  { return appointmentId; }
    public String  getRecordingUrl()   { return recordingUrl; }
    public String  getTranscriptText() { return transcriptText; }
    public Instant getCreatedAt()      { return createdAt; }

    public void setTranscriptText(String transcriptText) { this.transcriptText = transcriptText; }
}
