package com.preventia.payment.domain;

/**
 * Lifecycle states for a payment record.
 * Mirrors the payment_status PostgreSQL ENUM from V4__payments.sql.
 */
public enum PaymentStatus {
    PENDING,
    CAPTURED,
    FAILED,
    REFUNDED
}
