package com.preventia.chat.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

/**
 * Tracks which appointment reminders have been sent to prevent duplicates.
 * Maps to: appointment_reminders table (V18 migration).
 */
@Entity
@Table(name = "appointment_reminders",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_appt_reminder",
           columnNames = {"appointment_id", "reminder_type"}
       ))
public class AppointmentReminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "appointment_id", nullable = false)
    private Long appointmentId;

    /** '24H' or '1H' */
    @Column(name = "reminder_type", nullable = false, length = 10)
    private String reminderType;

    @CreationTimestamp
    @Column(name = "sent_at", nullable = false, updatable = false)
    private OffsetDateTime sentAt;

    protected AppointmentReminder() {}

    public AppointmentReminder(Long appointmentId, String reminderType) {
        this.appointmentId = appointmentId;
        this.reminderType  = reminderType;
    }

    public Long getId()              { return id; }
    public Long getAppointmentId()   { return appointmentId; }
    public String getReminderType()  { return reminderType; }
    public OffsetDateTime getSentAt() { return sentAt; }
}
