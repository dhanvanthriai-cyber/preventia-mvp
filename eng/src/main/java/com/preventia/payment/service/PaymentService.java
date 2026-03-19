package com.preventia.payment.service;

import com.preventia.payment.domain.Payment;
import com.preventia.payment.domain.PaymentGateway;
import com.preventia.payment.domain.PaymentStatus;
import com.preventia.payment.dto.CreatePaymentRequest;
import com.preventia.payment.dto.PaymentResponse;
import com.preventia.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

/**
 * Core payment orchestration service for Project Preventia.
 *
 * Handles:
 *   - Stripe PaymentIntent creation (USD / NRI sponsors)
 *   - Razorpay order creation (INR / India payers)
 *   - Webhook event handling (CAPTURED transitions)
 */
@Service
@Transactional
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final StripeGatewayService stripeGatewayService;
    private final RazorpayGatewayService razorpayGatewayService;

    public PaymentService(PaymentRepository paymentRepository,
                          StripeGatewayService stripeGatewayService,
                          RazorpayGatewayService razorpayGatewayService) {
        this.paymentRepository = paymentRepository;
        this.stripeGatewayService = stripeGatewayService;
        this.razorpayGatewayService = razorpayGatewayService;
    }

    // ─── Stripe ───────────────────────────────────────────────────────────────

    /**
     * Creates a Stripe PaymentIntent and persists a PENDING Payment record.
     *
     * @param request Caller-provided payment details
     * @return Response DTO including Stripe PaymentIntent ID (used as clientSecret on mobile)
     */
    public PaymentResponse createStripeIntent(CreatePaymentRequest request) {
        // Call stub gateway (returns pi_STUB_<uuid>)
        String paymentIntentId = stripeGatewayService.createIntent(
                request.amountCents(),
                "usd",
                Collections.singletonMap("paymentType", request.paymentType().name())
        );

        Payment payment = new Payment();
        payment.setPayerId(request.payerId());
        payment.setAppointmentId(request.appointmentId());
        payment.setAmountCents(request.amountCents());
        payment.setCurrency("USD");
        payment.setGateway(PaymentGateway.STRIPE);
        payment.setGatewayPaymentId(paymentIntentId);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setPaymentType(request.paymentType());

        payment = paymentRepository.save(payment);

        log.info("Stripe PaymentIntent created: id={} gatewayId={}", payment.getId(), paymentIntentId);

        return toResponse(payment, paymentIntentId /* used as clientSecret stub */);
    }

    // ─── Razorpay ─────────────────────────────────────────────────────────────

    /**
     * Creates a Razorpay order and persists a PENDING Payment record.
     *
     * @param request Caller-provided payment details
     * @return Response DTO including Razorpay order ID (used by mobile Razorpay SDK)
     */
    public PaymentResponse createRazorpayOrder(CreatePaymentRequest request) {
        // Call stub gateway (returns order_STUB_<uuid>)
        String orderId = razorpayGatewayService.createOrder(
                request.amountCents(), // treated as paise for INR
                "INR"
        );

        Payment payment = new Payment();
        payment.setPayerId(request.payerId());
        payment.setAppointmentId(request.appointmentId());
        payment.setAmountCents(request.amountCents());
        payment.setCurrency("INR");
        payment.setGateway(PaymentGateway.RAZORPAY);
        payment.setGatewayOrderId(orderId);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setPaymentType(request.paymentType());

        payment = paymentRepository.save(payment);

        log.info("Razorpay order created: id={} orderId={}", payment.getId(), orderId);

        return toResponse(payment, null);
    }

    // ─── Webhooks ─────────────────────────────────────────────────────────────

    /**
     * Handles Stripe webhook events.
     * On {@code payment_intent.succeeded}: transitions payment status to CAPTURED.
     *
     * @param payload Raw webhook payload from Stripe
     */
    public void handleStripeWebhook(Map<String, Object> payload) {
        String eventType = (String) payload.get("type");
        if (!"payment_intent.succeeded".equals(eventType)) {
            log.debug("Ignoring Stripe event type: {}", eventType);
            return;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) payload.get("data");
        @SuppressWarnings("unchecked")
        Map<String, Object> object = (Map<String, Object>) data.get("object");
        String gatewayPaymentId = (String) object.get("id");

        Optional<Payment> paymentOpt = paymentRepository.findByGatewayPaymentId(gatewayPaymentId);
        if (paymentOpt.isEmpty()) {
            log.warn("Stripe webhook: no payment found for gatewayPaymentId={}", gatewayPaymentId);
            return;
        }

        Payment payment = paymentOpt.get();
        payment.setStatus(PaymentStatus.CAPTURED);
        paymentRepository.save(payment);

        log.info("Stripe payment CAPTURED: id={} gatewayPaymentId={}", payment.getId(), gatewayPaymentId);
    }

    /**
     * Handles Razorpay webhook events.
     * On {@code payment.captured}: transitions payment status to CAPTURED.
     *
     * @param payload Raw webhook payload from Razorpay
     */
    public void handleRazorpayWebhook(Map<String, Object> payload) {
        String event = (String) payload.get("event");
        if (!"payment.captured".equals(event)) {
            log.debug("Ignoring Razorpay event type: {}", event);
            return;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> payloadData = (Map<String, Object>) payload.get("payload");
        @SuppressWarnings("unchecked")
        Map<String, Object> paymentEntity = (Map<String, Object>) payloadData.get("payment");
        @SuppressWarnings("unchecked")
        Map<String, Object> entity = (Map<String, Object>) paymentEntity.get("entity");
        String gatewayPaymentId = (String) entity.get("id");

        Optional<Payment> paymentOpt = paymentRepository.findByGatewayPaymentId(gatewayPaymentId);
        if (paymentOpt.isEmpty()) {
            log.warn("Razorpay webhook: no payment found for gatewayPaymentId={}", gatewayPaymentId);
            return;
        }

        Payment payment = paymentOpt.get();
        payment.setStatus(PaymentStatus.CAPTURED);
        paymentRepository.save(payment);

        log.info("Razorpay payment CAPTURED: id={} gatewayPaymentId={}", payment.getId(), gatewayPaymentId);
    }

    /**
     * Called by the Razorpay HMAC-verified webhook on {@code payment.captured}.
     * Looks up the pending Payment by Razorpay order ID, stamps the payment ID,
     * and transitions status to CAPTURED.
     *
     * @param gatewayOrderId   Razorpay order ID (order_xxx)
     * @param gatewayPaymentId Razorpay payment ID (pay_xxx)
     */
    @Transactional
    public void markPaid(String gatewayOrderId, String gatewayPaymentId) {
        paymentRepository.findByGatewayOrderId(gatewayOrderId).ifPresentOrElse(payment -> {
            payment.setGatewayPaymentId(gatewayPaymentId);
            payment.setStatus(PaymentStatus.CAPTURED);
            paymentRepository.save(payment);
            log.info("Razorpay payment CAPTURED: orderId={} paymentId={}", gatewayOrderId, gatewayPaymentId);
        }, () -> log.warn("Razorpay webhook: no payment found for orderId={}", gatewayOrderId));
    }

    // ─── Mapper ───────────────────────────────────────────────────────────────

    private PaymentResponse toResponse(Payment payment, String clientSecret) {
        return new PaymentResponse(
                payment.getId(),
                payment.getGateway(),
                payment.getGatewayPaymentId(),
                payment.getGatewayOrderId(),
                clientSecret,
                payment.getAmountCents(),
                payment.getCurrency(),
                payment.getStatus(),
                payment.getPaymentType(),
                payment.getExchangeRateAtCapture(),
                payment.getCreatedAt()
        );
    }
}
