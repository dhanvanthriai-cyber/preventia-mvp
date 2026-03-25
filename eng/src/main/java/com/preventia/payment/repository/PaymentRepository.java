package com.preventia.payment.repository;

import com.preventia.payment.domain.Payment;
import com.preventia.payment.domain.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link Payment}.
 *
 * Queries mirror the indexes defined in V4__payments.sql
 * (gateway_payment_id, payer_id, appointment_id, status).
 */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    /** Looks up a payment by the gateway's own payment ID (e.g. Stripe pi_xxx, Razorpay pay_xxx) */
    Optional<Payment> findByGatewayPaymentId(String gatewayPaymentId);

    /** Looks up a payment by its Razorpay order ID (e.g. order_xxx) */
    Optional<Payment> findByGatewayOrderId(String gatewayOrderId);

    /** All payments for a payer (any status), ordered by creation time descending. */
    List<Payment> findByPayerIdOrderByCreatedAtDesc(Long payerId);

    /** All payments for a payer filtered by lifecycle status */
    List<Payment> findByPayerIdAndStatus(Long payerId, PaymentStatus status);

    /** Payments linked to a specific appointment */
    List<Payment> findByAppointmentId(Long appointmentId);
}
