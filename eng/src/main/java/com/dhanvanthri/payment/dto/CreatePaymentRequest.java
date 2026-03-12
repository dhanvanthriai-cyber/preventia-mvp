package com.dhanvanthri.payment.dto;

import com.dhanvanthri.payment.domain.PaymentType;

/**
 * Inbound DTO for creating a new payment intent / order.
 *
 * @param payerId       ID of the paying user (SPONSOR or RECIPIENT)
 * @param appointmentId Optional — linked appointment; null for medication/lab payments
 * @param amountCents   Amount in smallest unit (cents for USD, paise for INR)
 * @param paymentType   What the payment is for
 */
public record CreatePaymentRequest(
        Long payerId,
        Long appointmentId,
        Long amountCents,
        PaymentType paymentType
) {}
