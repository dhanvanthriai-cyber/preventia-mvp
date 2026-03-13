package com.dhanvanthri.payment.controller;

import com.dhanvanthri.payment.dto.CreatePaymentRequest;
import com.dhanvanthri.payment.dto.PaymentResponse;
import com.dhanvanthri.payment.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

/**
 * REST controller for payment creation and webhook ingestion.
 */
@RestController
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;
    private final ObjectMapper   objectMapper;

    @Value("${razorpay.webhook-secret:STUB}")
    private String webhookSecret;

    public PaymentController(PaymentService paymentService, ObjectMapper objectMapper) {
        this.paymentService = paymentService;
        this.objectMapper   = objectMapper;
    }

    // ─── Stripe ───────────────────────────────────────────────────────────────

    @PostMapping("/api/v1/payments/stripe/create-intent")
    @PreAuthorize("hasRole('SPONSOR')")
    public ResponseEntity<PaymentResponse> createStripeIntent(
            @RequestBody CreatePaymentRequest request) {
        return ResponseEntity.ok(paymentService.createStripeIntent(request));
    }

    // ─── Razorpay ─────────────────────────────────────────────────────────────

    @PostMapping("/api/v1/payments/razorpay/create-order")
    @PreAuthorize("hasAnyRole('SPONSOR', 'RECIPIENT')")
    public ResponseEntity<PaymentResponse> createRazorpayOrder(
            @RequestBody CreatePaymentRequest request) {
        return ResponseEntity.ok(paymentService.createRazorpayOrder(request));
    }

    // ─── Legacy webhooks (no HMAC — kept for backward compat) ─────────────────

    @PostMapping("/api/v1/webhook/stripe")
    public ResponseEntity<Void> stripeWebhook(@RequestBody Map<String, Object> payload) {
        paymentService.handleStripeWebhook(payload);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/v1/webhook/razorpay")
    public ResponseEntity<Void> razorpayWebhookLegacy(@RequestBody Map<String, Object> payload) {
        paymentService.handleRazorpayWebhook(payload);
        return ResponseEntity.ok().build();
    }

    // ─── HMAC-verified Razorpay webhook (live path) ───────────────────────────

    /**
     * POST /webhooks/razorpay
     *
     * Verifies X-Razorpay-Signature using HMAC-SHA256(webhookSecret, rawBody).
     * On payment.captured → paymentService.markPaid(orderId, paymentId).
     *
     * Always returns HTTP 200 — Razorpay retries on non-200.
     * When webhookSecret == "STUB" (dev mode), signature check is skipped.
     */
    @PostMapping("/webhooks/razorpay")
    public ResponseEntity<Void> razorpayWebhookVerified(
            @RequestBody byte[] rawBody,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {

        if (!"STUB".equals(webhookSecret)) {
            if (signature == null || !verifyHmacSha256(webhookSecret, rawBody, signature)) {
                log.warn("[razorpay-webhook] Signature mismatch — ignoring payload");
                return ResponseEntity.ok().build();
            }
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = objectMapper.readValue(rawBody, Map.class);
            String event = (String) payload.get("event");

            if ("payment.captured".equals(event)) {
                @SuppressWarnings("unchecked")
                Map<String, Object> pd = (Map<String, Object>) payload.get("payload");
                @SuppressWarnings("unchecked")
                Map<String, Object> pe = (Map<String, Object>) pd.get("payment");
                @SuppressWarnings("unchecked")
                Map<String, Object> entity = (Map<String, Object>) pe.get("entity");
                String paymentId = (String) entity.get("id");
                String orderId   = (String) entity.get("order_id");
                paymentService.markPaid(orderId, paymentId);
            } else {
                log.debug("[razorpay-webhook] Ignoring event: {}", event);
            }
        } catch (Exception e) {
            log.error("[razorpay-webhook] Parse error: {}", e.getMessage());
        }

        return ResponseEntity.ok().build();
    }

    private boolean verifyHmacSha256(String secret, byte[] body, String expected) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hmacBytes = mac.doFinal(body);
            StringBuilder sb = new StringBuilder(hmacBytes.length * 2);
            for (byte b : hmacBytes) sb.append(String.format("%02x", b));
            String computed = sb.toString();
            return MessageDigest.isEqual(
                computed.getBytes(StandardCharsets.UTF_8),
                expected.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("[razorpay-webhook] HMAC computation error: {}", e.getMessage());
            return false;
        }
    }
}
