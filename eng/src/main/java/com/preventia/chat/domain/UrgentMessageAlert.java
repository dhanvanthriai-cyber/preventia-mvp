package com.preventia.chat.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

/**
 * Tracks urgent Stream Chat messages for SLA monitoring.
 * Maps to: urgent_message_alerts table (V19 migration).
 */
@Entity
@Table(name = "urgent_message_alerts",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_urgent_alert",
           columnNames = {"channel_id", "message_id"}
       ))
public class UrgentMessageAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "channel_id", nullable = false, length = 255)
    private String channelId;

    @Column(name = "message_id", nullable = false, length = 255)
    private String messageId;

    @CreationTimestamp
    @Column(name = "sent_at", nullable = false, updatable = false)
    private OffsetDateTime sentAt;

    @Column(name = "alert_sent_at")
    private OffsetDateTime alertSentAt;

    protected UrgentMessageAlert() {}

    public UrgentMessageAlert(String channelId, String messageId) {
        this.channelId = channelId;
        this.messageId = messageId;
    }

    public Long getId()                       { return id; }
    public String getChannelId()              { return channelId; }
    public String getMessageId()              { return messageId; }
    public OffsetDateTime getSentAt()         { return sentAt; }
    public OffsetDateTime getAlertSentAt()    { return alertSentAt; }
    public void setAlertSentAt(OffsetDateTime t) { this.alertSentAt = t; }
}
