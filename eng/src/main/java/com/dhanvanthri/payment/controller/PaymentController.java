package com.dhanvanthri.payment.controller;

import com.dhanvanthri.payment.dto.CreatePaymentRequest;
import com.dhanvanthri.payment.dto.PaymentResponse;
import com.dhanvanthri.payment.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for payment creation and webhook ingestion.
 *
 * Authorization summary:
 *   POST /api/v1/payments/stripe/create-intent    — SPONSOR only
 *   POST /api/v1/payments/razorpay/create-order   — SPONSOR or RECIPIENT
 *   POST /api/v1/webhook/stripe                   — public (Stripe calls this)
 *   POST /api/v1/webhook/razorpay                 — public (Razorpay calls this)
 *
 * Webhook endpoints must be listed in SecurityConfig permitAll() list.
 */
@RestController
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    // ─── Stripe ───────────────────────────────────────────────────────────────

    /**
     * Creates a Stripe PaymentIntent (USD).
     * Restricted to NRI sponsors who are funding family members' care.
     */
    @PostMapping("/api/v1/payments/stripe/create-intent")
    @PreAuthorize("hasRole('SPONSOR')")
    public ResponseEntity<PaymentResponse> createStripeIntent(
            @RequestBody CreatePaymentRequest request) {
        PaymentResponse response = paymentService.createStripeIntent(request);
        return ResponseEntity.ok(response);
    }

    // ─── Razorpay ─────────────────────────────────────────────────────────────

    /**
     * Creates a Razorpay order (INR).
     * Available to both SPONSOR (paying from abroad via INR) and RECIPIENT
     * (India-based patient self-paying).
     */
    @PostMapping("/api/v1/payments/razorpay/create-order")
    @PreAuthorize("hasAnyRole('SPONSOR', 'RECIPIENT')")
    public ResponseEntity<PaymentResponse> createRazorpayOrder(
            @RequestBody CreatePaymentRequest request) {
        PaymentResponse response = paymentService.createRazorpayOrder(request);
        return ResponseEntity.ok(response);
    }

    // ─── Webhooks (public — no JWT required) ─────────────────────────────────

    /**
     * Receives Stripe webhook events.
     * Permitted without authentication (Stripe signs with webhook secret — validate in prod).
     *
     * TODO: Add Stripe-Signature header verification in production.
     */
    @PostMapping("/api/v1/webhook/stripe")
    public ResponseEntity<Void> stripeWebhook(@RequestBody Map<String, Object> payload) {
        paymentService.handleStripeWebhook(payload);
        return ResponseEntity.ok().build();
    }

    /**
     * Receives Razorpay webhook events.
     * Permitted without authentication (Razorpay signs with HMAC-SHA256 — validate in prod).
     *
     * TODO: Add X-Razorpay-Signature header verification in production.
     */
    @PostMapping("/api/v1/webhook/razorpay")
    public ResponseEntity<Void> razorpayWebhook(@RequestBody Map<String, Object> payload) {
        paymentService.handleRazorpayWebhook(payload);
        return ResponseEntity.ok().build();
    }
}
