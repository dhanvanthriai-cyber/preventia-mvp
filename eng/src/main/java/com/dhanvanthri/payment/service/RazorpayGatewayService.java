package com.dhanvanthri.payment.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Razorpay order creation service.
 *
 * When RAZORPAY_API_KEY is not configured (value == "STUB"), the service
 * operates in stub mode: no network call is made and a fake order ID is
 * returned. This keeps the backend startable without live credentials.
 *
 * To go live: set RAZORPAY_API_KEY and RAZORPAY_API_SECRET environment
 * variables (or add to .env). The stub guard will automatically deactivate.
 */
@Service
public class RazorpayGatewayService {

    private static final Logger log = LoggerFactory.getLogger(RazorpayGatewayService.class);
    private static final String STUB_SENTINEL = "STUB";

    @Value("${razorpay.api.key:STUB}")
    private String apiKey;

    @Value("${razorpay.api.secret:STUB}")
    private String apiSecret;

    /**
     * Creates a Razorpay order for the given amount.
     *
     * @param amountPaise Amount in INR paise (e.g. 250000 = ₹2,500)
     * @param currency    ISO 4217 currency code — expected "INR"
     * @return Razorpay order ID (e.g. {@code order_abc123}) or stub ID in dev mode
     * @throws RuntimeException wrapping {@link RazorpayException} on SDK failure
     */
    public String createOrder(long amountPaise, String currency) {
        if (STUB_SENTINEL.equals(apiKey)) {
            String stubId = "order_STUB_" + UUID.randomUUID().toString().replace("-", "");
            log.info("[razorpay] STUB mode — returning fake order ID: {}", stubId);
            return stubId;
        }

        try {
            RazorpayClient client = new RazorpayClient(apiKey, apiSecret);

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountPaise);
            orderRequest.put("currency", currency);
            // Receipt must be unique and ≤ 40 chars
            orderRequest.put("receipt", "rcpt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20));

            Order order = client.orders.create(orderRequest);
            String orderId = order.get("id");

            log.info("[razorpay] Order created: id={} amount={} {}", orderId, amountPaise, currency);
            return orderId;

        } catch (RazorpayException e) {
            log.warn("[razorpay] Order creation failed: {}", e.getMessage());
            throw new RuntimeException("Razorpay order creation failed: " + e.getMessage(), e);
        }
    }
}
