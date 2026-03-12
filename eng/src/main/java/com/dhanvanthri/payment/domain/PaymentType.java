package com.dhanvanthri.payment.domain;

/**
 * What the payment is for.
 * Mirrors the payment_type PostgreSQL ENUM from V4__payments.sql.
 */
public enum PaymentType {
    CONSULTATION,
    MEDICATION,
    LAB_ORDER
}
