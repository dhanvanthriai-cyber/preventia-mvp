package com.dhanvanthri.lab.service;

import com.dhanvanthri.lab.domain.LabOrder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

/**
 * Stub integration layer for the Thyrocare REST API.
 *
 * Real implementation will POST to https://new.thyrocare.com/api/* using
 * {@code thyrocare.api.key}. All methods currently log TODOs and return
 * synthetic data so the rest of the application can be built and tested.
 */
@Service
public class ThyrocareApiService {

    private static final Logger log = LoggerFactory.getLogger(ThyrocareApiService.class);

    @Value("${thyrocare.api.key:STUB}")
    private String apiKey;

    /**
     * Place a new order with Thyrocare.
     *
     * @param order the LabOrder entity (pre-save, no externalOrderId yet)
     * @return map with keys {@code orderId} and {@code trackingId}
     */
    public Map<String, String> placeOrder(LabOrder order) {
        log.info("TODO: POST to Thyrocare API — testCode={}, patientId={}, apiKey={}",
                order.getTestCode(), order.getPatientId(),
                apiKey.equals("STUB") ? "STUB (not configured)" : "***");

        String stubOrderId   = "STUB-" + UUID.randomUUID();
        String stubTrackingId = "TRK-" + UUID.randomUUID();

        log.debug("Thyrocare stub response — orderId={}, trackingId={}", stubOrderId, stubTrackingId);
        return Map.of("orderId", stubOrderId, "trackingId", stubTrackingId);
    }

    /**
     * Fetch the result PDF for a completed order.
     *
     * @param externalOrderId the Thyrocare order ID returned by {@link #placeOrder}
     * @return S3 key string once real implementation stores the PDF; null from stub
     */
    public String fetchResult(String externalOrderId) {
        log.info("TODO: GET result PDF from Thyrocare — externalOrderId={}", externalOrderId);
        return null;
    }
}
