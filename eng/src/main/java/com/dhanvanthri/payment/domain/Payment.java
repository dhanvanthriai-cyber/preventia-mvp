package com.dhanvanthri.payment.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * JPA entity for the {@code payments} table (V4__payments.sql).
 *
 * Dual-gateway design:
 *   - gateway=STRIPE  → currency=USD, NRI sponsors
 *   - gateway=RAZORPAY → currency=INR, India-based payers
 *
 * Refund policy enforced at the application layer (PaymentService).
 */
@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nullable FK — payments can exist without a linked appointment (e.g., medication top-ups) */
    @Column(name = "appointment_id")
    private Long appointmentId;

    /** FK to users.id — the person who is paying */
    @Column(name = "payer_id", nullable = false)
    private Long payerId;

    /** Amount in the smallest currency unit (cents for USD, paise for INR) */
    @Column(name = "amount_cents", nullable = false)
    private Long amountCents;

    /** ISO 4217 currency code: "USD" or "INR" */
    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "gateway", nullable = false, columnDefinition = "payment_gateway")
    private PaymentGateway gateway;

    /** Gateway's own payment identifier (e.g. Stripe PaymentIntent ID: pi_xxx) */
    @Column(name = "gateway_payment_id")
    private String gatewayPaymentId;

    /** Gateway's order identifier (Razorpay order_xxx) */
    @Column(name = "gateway_order_id")
    private String gatewayOrderId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "payment_status")
    private PaymentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false, columnDefinition = "payment_type")
    private PaymentType paymentType;

    /** USD→INR (or vice-versa) exchange rate at the moment of capture; nullable */
    @Column(name = "exchange_rate_at_capture", precision = 10, scale = 4)
    private BigDecimal exchangeRateAtCapture;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = PaymentStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    // ─── Getters & Setters ────────────────────────────────────────────────────

    public Long getId() { return id; }

    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long appointmentId) { this.appointmentId = appointmentId; }

    public Long getPayerId() { return payerId; }
    public void setPayerId(Long payerId) { this.payerId = payerId; }

    public Long getAmountCents() { return amountCents; }
    public void setAmountCents(Long amountCents) { this.amountCents = amountCents; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public PaymentGateway getGateway() { return gateway; }
    public void setGateway(PaymentGateway gateway) { this.gateway = gateway; }

    public String getGatewayPaymentId() { return gatewayPaymentId; }
    public void setGatewayPaymentId(String gatewayPaymentId) { this.gatewayPaymentId = gatewayPaymentId; }

    public String getGatewayOrderId() { return gatewayOrderId; }
    public void setGatewayOrderId(String gatewayOrderId) { this.gatewayOrderId = gatewayOrderId; }

    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }

    public PaymentType getPaymentType() { return paymentType; }
    public void setPaymentType(PaymentType paymentType) { this.paymentType = paymentType; }

    public BigDecimal getExchangeRateAtCapture() { return exchangeRateAtCapture; }
    public void setExchangeRateAtCapture(BigDecimal exchangeRateAtCapture) {
        this.exchangeRateAtCapture = exchangeRateAtCapture;
    }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
