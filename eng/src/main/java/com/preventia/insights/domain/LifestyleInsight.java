package com.preventia.insights.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * A lifestyle / health insight authored by a doctor and broadcast to all
 * patients they have ever consulted.
 *
 * Maps to: lifestyle_insights table (V23 migration).
 *
 * Categories: NUTRITION | FITNESS | MENTAL_HEALTH | SLEEP | GENERAL
 */
@Entity
@Table(name = "lifestyle_insights")
public class LifestyleInsight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FK to users.id — the doctor who authored this insight. */
    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    /** Snapshot of the doctor's display name at post time. */
    @Column(name = "doctor_name", length = 255)
    private String doctorName;

    /** Insight category — one of NUTRITION, FITNESS, MENTAL_HEALTH, SLEEP, GENERAL. */
    @Column(name = "category", nullable = false, length = 50)
    private String category;

    /** Short headline for the insight. */
    @Column(name = "title", nullable = false, length = 255)
    private String title;

    /** Full insight body text. */
    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    /**
     * Stream Chat message ID returned after the bot successfully posts to the
     * insights channel. Null if Stream is in stub mode or the post failed.
     */
    @Column(name = "stream_message_id", length = 255)
    private String streamMessageId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected LifestyleInsight() {}

    public LifestyleInsight(Long doctorId, String doctorName, String category,
                            String title, String body) {
        this.doctorId   = doctorId;
        this.doctorName = doctorName;
        this.category   = category == null || category.isBlank() ? "GENERAL" : category.toUpperCase();
        this.title      = title;
        this.body       = body;
        this.createdAt  = Instant.now();
    }

    // -------------------------------------------------------------------------
    // Getters / setters
    // -------------------------------------------------------------------------

    public Long    getId()              { return id; }
    public Long    getDoctorId()        { return doctorId; }
    public String  getDoctorName()      { return doctorName; }
    public String  getCategory()        { return category; }
    public String  getTitle()           { return title; }
    public String  getBody()            { return body; }
    public String  getStreamMessageId() { return streamMessageId; }
    public Instant getCreatedAt()       { return createdAt; }

    public void setStreamMessageId(String streamMessageId) {
        this.streamMessageId = streamMessageId;
    }
}
