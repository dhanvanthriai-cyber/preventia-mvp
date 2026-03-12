package com.dhanvanthri.payment.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

/**
 * Stub gateway service for Stripe payments.
 *
 * STUB implementation — returns a mock PaymentIntent ID.
 *
 * TODO: Replace stub with real implementation using the official SDK:
 *   <!-- pom.xml dependency -->
 *   <dependency>
 *       <groupId>com.stripe</groupId>
 *       <artifactId>stripe-java</artifactId>
 *       <version>24.x.x</version>
 *   </dependency>
 *   Real call: com.stripe.model.PaymentIntent.create(params)
 */
@Service
public class StripeGatewayService {

    @Value("${stripe.api.key:STUB}")
    private String apiKey;

    /**
     * Creates a Stripe PaymentIntent for the given amount.
     *
     * @param amountCents Amount in USD cents (e.g., 500 = $5.00)
     * @param currency    ISO 4217 currency code (expected: "usd" for Stripe API)
     * @param metadata    Key-value metadata attached to the PaymentIntent
     * @return Stub PaymentIntent ID in format {@code pi_STUB_<uuid>}
     */
    public String createIntent(long amountCents, String currency, Map<String, String> metadata) {
        // TODO: Replace with real Stripe SDK call
        // Stripe.apiKey = apiKey;
        // PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
        //     .setAmount(amountCents)
        //     .setCurrency(currency)
        //     .putAllMetadata(metadata)
        //     .build();
        // PaymentIntent intent = PaymentIntent.create(params);
        // return intent.getId();

        String stubId = "pi_STUB_" + UUID.randomUUID().toString().replace("-", "");
        return stubId;
    }
}
