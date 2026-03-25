package com.preventia.payment.dto;

import com.preventia.payment.domain.PaymentGateway;
import com.preventia.payment.domain.PaymentStatus;
import com.preventia.payment.domain.PaymentType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Outbound DTO returned from payment creation and webhook processing.
 *
 * The {@code clientSecret} / {@code orderId} fields are used by the mobile
 * client to complete the payment flow via the respective SDK.
 *
 * @param id                 Internal payment record ID
 * @param gateway            Which gateway processed this
 * @param gatewayPaymentId   Stripe PaymentIntent ID or Razorpay payment ID
 * @param gatewayOrderId     Razorpay order ID (null for Stripe)
 * @param clientSecret       Stripe client secret for mobile SDK (null for Razorpay)
 * @param amountCents        Amount in smallest currency unit
 * @param currency           "USD" or "INR"
 * @param status             Current payment lifecycle status
 * @param paymentType        What was paid for
 * @param exchangeRateAtCapture  FX rate at capture time (may be null)
 * @param createdAt          Record creation timestamp
 */
public record PaymentResponse(
        Long id,
        PaymentGateway gateway,
        String gatewayPaymentId,
        String gatewayOrderId,
        String clientSecret,
        Long amountCents,
        String currency,
        PaymentStatus status,
        PaymentType paymentType,
        BigDecimal exchangeRateAtCapture,
        OffsetDateTime createdAt
) {
    /** Factory — maps entity to response with no client secret (read-only view). */
    public static PaymentResponse from(com.preventia.payment.domain.Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getGateway(),
                payment.getGatewayPaymentId(),
                payment.getGatewayOrderId(),
                null,          // clientSecret not needed for read-only dashboard view
                payment.getAmountCents(),
                payment.getCurrency(),
                payment.getStatus(),
                payment.getPaymentType(),
                payment.getExchangeRateAtCapture(),
                payment.getCreatedAt()
        );
    }
}
