package com.preventia.payment.controller;

import com.preventia.payment.dto.CreatePaymentRequest;
import com.preventia.payment.dto.PaymentResponse;
import com.preventia.payment.service.PaymentService;
import com.preventia.ops.service.WebhookEventLogService;
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
    private final WebhookEventLogService webhookEventLogService;
    private final ObjectMapper   objectMapper;

    @Value("${razorpay.webhook-secret:STUB}")
    private String webhookSecret;

    public PaymentController(PaymentService paymentService,
                             WebhookEventLogService webhookEventLogService,
                             ObjectMapper objectMapper) {
        this.paymentService = paymentService;
        this.webhookEventLogService = webhookEventLogService;
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
        String eventType = stringValue(payload.get("type"), "unknown");
        String paymentIntentId = extractStripePaymentId(payload);
        paymentService.handleStripeWebhook(payload);
        webhookEventLogService.record(
            "STRIPE",
            "/api/v1/webhook/stripe",
            eventType,
            paymentIntentId,
            null,
            200,
            null,
            "type=" + eventType + (paymentIntentId == null ? "" : ", paymentIntent=" + paymentIntentId)
        );
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/v1/webhook/razorpay")
    public ResponseEntity<Void> razorpayWebhookLegacy(@RequestBody Map<String, Object> payload) {
        String event = stringValue(payload.get("event"), "unknown");
        String paymentId = extractRazorpayPaymentId(payload);
        paymentService.handleRazorpayWebhook(payload);
        webhookEventLogService.record(
            "RAZORPAY",
            "/api/v1/webhook/razorpay",
            event,
            paymentId,
            null,
            200,
            null,
            "event=" + event + (paymentId == null ? "" : ", paymentId=" + paymentId)
        );
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
                webhookEventLogService.record("RAZORPAY", "/webhooks/razorpay", "signature_failed", null, null, 401, false, "Razorpay webhook signature mismatch");
                return ResponseEntity.ok().build();
            }
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = objectMapper.readValue(rawBody, Map.class);
            String event = (String) payload.get("event");
            String paymentId = extractRazorpayPaymentId(payload);
            String orderId = extractRazorpayOrderId(payload);

            if ("payment.captured".equals(event)) {
                @SuppressWarnings("unchecked")
                Map<String, Object> pd = (Map<String, Object>) payload.get("payload");
                @SuppressWarnings("unchecked")
                Map<String, Object> pe = (Map<String, Object>) pd.get("payment");
                @SuppressWarnings("unchecked")
                Map<String, Object> entity = (Map<String, Object>) pe.get("entity");
                paymentId = (String) entity.get("id");
                orderId = (String) entity.get("order_id");
                paymentService.markPaid(orderId, paymentId);
            } else {
                log.debug("[razorpay-webhook] Ignoring event: {}", event);
            }
            webhookEventLogService.record(
                "RAZORPAY",
                "/webhooks/razorpay",
                event == null ? "unknown" : event,
                orderId != null ? orderId : paymentId,
                null,
                200,
                !"STUB".equals(webhookSecret) ? Boolean.TRUE : null,
                "event=" + event
                    + (orderId == null ? "" : ", orderId=" + orderId)
                    + (paymentId == null ? "" : ", paymentId=" + paymentId)
            );
        } catch (Exception e) {
            log.error("[razorpay-webhook] Parse error: {}", e.getMessage());
            webhookEventLogService.record(
                "RAZORPAY",
                "/webhooks/razorpay",
                "parse_error",
                null,
                null,
                400,
                !"STUB".equals(webhookSecret) ? Boolean.TRUE : null,
                "Unable to parse Razorpay webhook payload"
            );
        }

        return ResponseEntity.ok().build();
    }

    @SuppressWarnings("unchecked")
    private String extractStripePaymentId(Map<String, Object> payload) {
        Object data = payload.get("data");
        if (data instanceof Map<?, ?> dataMap) {
            Object object = ((Map<String, Object>) dataMap).get("object");
            if (object instanceof Map<?, ?> objectMap) {
                Object id = ((Map<String, Object>) objectMap).get("id");
                if (id != null) {
                    return String.valueOf(id);
                }
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private String extractRazorpayPaymentId(Map<String, Object> payload) {
        Object payloadObject = payload.get("payload");
        if (payloadObject instanceof Map<?, ?> payloadMap) {
            Object payment = ((Map<String, Object>) payloadMap).get("payment");
            if (payment instanceof Map<?, ?> paymentMap) {
                Object entity = ((Map<String, Object>) paymentMap).get("entity");
                if (entity instanceof Map<?, ?> entityMap) {
                    Object id = ((Map<String, Object>) entityMap).get("id");
                    if (id != null) {
                        return String.valueOf(id);
                    }
                }
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private String extractRazorpayOrderId(Map<String, Object> payload) {
        Object payloadObject = payload.get("payload");
        if (payloadObject instanceof Map<?, ?> payloadMap) {
            Object payment = ((Map<String, Object>) payloadMap).get("payment");
            if (payment instanceof Map<?, ?> paymentMap) {
                Object entity = ((Map<String, Object>) paymentMap).get("entity");
                if (entity instanceof Map<?, ?> entityMap) {
                    Object orderId = ((Map<String, Object>) entityMap).get("order_id");
                    if (orderId != null) {
                        return String.valueOf(orderId);
                    }
                }
            }
        }
        return null;
    }

    private String stringValue(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = String.valueOf(value);
        return text.isBlank() ? fallback : text;
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
