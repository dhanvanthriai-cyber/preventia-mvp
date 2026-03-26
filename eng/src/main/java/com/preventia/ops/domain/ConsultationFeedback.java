package com.preventia.ops.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Patient/sponsor satisfaction survey response for a completed consultation.
 * Maps to: consultation_feedback table (V27 migration).
 */
@Entity
@Table(name = "consultation_feedback")
public class ConsultationFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "appointment_id", nullable = false)
    private Long appointmentId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "rating")
    private Integer rating; // 1–5

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    protected ConsultationFeedback() {}

    public ConsultationFeedback(Long appointmentId, Long userId, Integer rating, String comment) {
        this.appointmentId = appointmentId;
        this.userId        = userId;
        this.rating        = rating;
        this.comment       = comment;
        this.submittedAt   = Instant.now();
    }

    public Long    getId()            { return id; }
    public Long    getAppointmentId() { return appointmentId; }
    public Long    getUserId()        { return userId; }
    public Integer getRating()        { return rating; }
    public String  getComment()       { return comment; }
    public Instant getSubmittedAt()   { return submittedAt; }
}
