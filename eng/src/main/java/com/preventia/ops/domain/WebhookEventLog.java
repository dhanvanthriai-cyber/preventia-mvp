package com.preventia.ops.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "webhook_event_log")
public class WebhookEventLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(nullable = false, length = 120)
    private String endpoint;

    @Column(name = "event_type", nullable = false, length = 120)
    private String eventType;

    @Column(name = "reference_id", length = 255)
    private String referenceId;

    @Column(name = "room_name", length = 255)
    private String roomName;

    @Column(name = "status_code", nullable = false)
    private int statusCode;

    @Column(name = "signature_valid")
    private Boolean signatureValid;

    @Column(name = "payload_summary", columnDefinition = "TEXT")
    private String payloadSummary;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String referenceId) { this.referenceId = referenceId; }
    public String getRoomName() { return roomName; }
    public void setRoomName(String roomName) { this.roomName = roomName; }
    public int getStatusCode() { return statusCode; }
    public void setStatusCode(int statusCode) { this.statusCode = statusCode; }
    public Boolean getSignatureValid() { return signatureValid; }
    public void setSignatureValid(Boolean signatureValid) { this.signatureValid = signatureValid; }
    public String getPayloadSummary() { return payloadSummary; }
    public void setPayloadSummary(String payloadSummary) { this.payloadSummary = payloadSummary; }
    public Instant getCreatedAt() { return createdAt; }
}
