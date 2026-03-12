package com.dhanvanthri.payment.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Stub gateway service for Razorpay payments.
 *
 * STUB implementation — returns a mock order ID.
 *
 * TODO: Replace stub with real implementation using the official SDK:
 *   <!-- pom.xml dependency -->
 *   <dependency>
 *       <groupId>com.razorpay</groupId>
 *       <artifactId>razorpay-java</artifactId>
 *       <version>1.4.x</version>
 *   </dependency>
 *   Real call: new RazorpayClient(apiKey, apiSecret).orders.create(orderRequest)
 */
@Service
public class RazorpayGatewayService {

    @Value("${razorpay.api.key:STUB}")
    private String apiKey;

    @Value("${razorpay.api.secret:STUB}")
    private String apiSecret;

    /**
     * Creates a Razorpay order for the given amount.
     *
     * @param amountPaise Amount in INR paise (e.g., 50000 = ₹500)
     * @param currency    ISO 4217 currency code (expected: "INR")
     * @return Stub order ID in format {@code order_STUB_<uuid>}
     */
    public String createOrder(long amountPaise, String currency) {
        // TODO: Replace with real Razorpay SDK call
        // RazorpayClient client = new RazorpayClient(apiKey, apiSecret);
        // JSONObject orderRequest = new JSONObject();
        // orderRequest.put("amount", amountPaise);
        // orderRequest.put("currency", currency);
        // orderRequest.put("receipt", "rcpt_" + UUID.randomUUID());
        // Order order = client.orders.create(orderRequest);
        // return order.get("id");

        String stubId = "order_STUB_" + UUID.randomUUID().toString().replace("-", "");
        return stubId;
    }
}
