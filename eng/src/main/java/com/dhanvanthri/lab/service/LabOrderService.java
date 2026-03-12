package com.dhanvanthri.lab.service;

import com.dhanvanthri.lab.domain.LabOrder;
import com.dhanvanthri.lab.domain.LabOrderStatus;
import com.dhanvanthri.lab.dto.CreateLabOrderRequest;
import com.dhanvanthri.lab.dto.LabOrderResponse;
import com.dhanvanthri.lab.repository.LabOrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

/**
 * Business logic for lab order management.
 *
 * Orchestrates:
 *  - Order creation (entity build → save → Thyrocare API call → persist IDs)
 *  - Webhook handling (status transitions on sample_collected / results_ready)
 *  - Cold chain temperature logging + breach detection
 */
@Service
@Transactional
public class LabOrderService {

    private static final Logger log = LoggerFactory.getLogger(LabOrderService.class);

    /** Safe upper bound for cold chain samples in °C (CPCB/ICMR guideline). */
    private static final float COLD_CHAIN_MAX_TEMP_CELSIUS = 8.0f;

    private final LabOrderRepository labOrderRepository;
    private final ThyrocareApiService thyrocareApiService;

    public LabOrderService(LabOrderRepository labOrderRepository,
                           ThyrocareApiService thyrocareApiService) {
        this.labOrderRepository = labOrderRepository;
        this.thyrocareApiService = thyrocareApiService;
    }

    // -------------------------------------------------------------------------
    // Create order
    // -------------------------------------------------------------------------

    /**
     * Creates a lab order, submits it to the lab partner API, and persists the
     * returned external IDs.
     *
     * @param request validated request from the controller
     * @return response DTO with entity fields + Thyrocare-assigned IDs
     */
    public LabOrderResponse createOrder(CreateLabOrderRequest request) {
        // 1. Build entity
        LabOrder order = new LabOrder();
        order.setAppointmentId(request.appointmentId());
        order.setPatientId(request.patientId());
        order.setLabPartner(request.labPartner());
        order.setTestCode(request.testCode());
        order.setTestName(request.testName());
        order.setRequiresColdChain(request.requiresColdChain());
        order.setCollectionAddress(request.collectionAddress());
        order.setNotes(request.notes());
        order.setStatus(LabOrderStatus.ORDERED);

        // 2. Persist before API call (get DB-assigned ID, ensure rollback on failure)
        LabOrder saved = labOrderRepository.save(order);

        // 3. Call Thyrocare API
        Map<String, String> apiResponse = thyrocareApiService.placeOrder(saved);

        // 4. Update with external IDs returned by lab partner
        saved.setExternalOrderId(apiResponse.get("orderId"));
        saved.setTrackingId(apiResponse.get("trackingId"));
        saved = labOrderRepository.save(saved);

        log.info("Lab order created — id={}, externalOrderId={}, testCode={}",
                saved.getId(), saved.getExternalOrderId(), saved.getTestCode());

        return LabOrderResponse.from(saved);
    }

    // -------------------------------------------------------------------------
    // Webhook handler
    // -------------------------------------------------------------------------

    /**
     * Processes inbound events from the Thyrocare webhook.
     *
     * <ul>
     *   <li>{@code sample_collected} → status = COLLECTED</li>
     *   <li>{@code results_ready}    → status = RESULTED, fetches PDF key</li>
     * </ul>
     *
     * @param externalOrderId Thyrocare order ID (matches {@code lab_orders.external_order_id})
     * @param event           webhook event type string
     */
    public void handleWebhook(String externalOrderId, String event) {
        LabOrder order = labOrderRepository.findByExternalOrderId(externalOrderId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No lab order found for externalOrderId: " + externalOrderId));

        switch (event) {
            case "sample_collected" -> {
                order.setStatus(LabOrderStatus.COLLECTED);
                order.setCollectedAt(Instant.now());
                log.info("Lab order COLLECTED — id={}, externalOrderId={}", order.getId(), externalOrderId);
            }
            case "results_ready" -> {
                order.setStatus(LabOrderStatus.RESULTED);
                order.setResultedAt(Instant.now());
                String pdfKey = thyrocareApiService.fetchResult(externalOrderId);
                if (pdfKey != null) {
                    order.setResultPdfKey(pdfKey);
                }
                log.info("Lab order RESULTED — id={}, externalOrderId={}, pdfKey={}",
                        order.getId(), externalOrderId, pdfKey);
            }
            default -> log.warn("Unrecognised Thyrocare webhook event '{}' for externalOrderId={}",
                    event, externalOrderId);
        }

        labOrderRepository.save(order);
    }

    // -------------------------------------------------------------------------
    // Cold chain temperature tracking
    // -------------------------------------------------------------------------

    /**
     * Records a temperature reading for a cold-chain lab order and flags a
     * breach if the temperature exceeds {@value #COLD_CHAIN_MAX_TEMP_CELSIUS}°C.
     *
     * @param orderId DB primary key of the lab order
     * @param temp    temperature reading in °C
     * @return updated response DTO
     */
    public LabOrderResponse updateTempReading(Long orderId, float temp) {
        LabOrder order = labOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Lab order not found: " + orderId));

        order.setLastTempReading(BigDecimal.valueOf(temp));
        order.setTempLoggedAt(Instant.now());

        if (order.isRequiresColdChain() && temp > COLD_CHAIN_MAX_TEMP_CELSIUS) {
            order.setColdChainBreached(true);
            log.warn("COLD CHAIN BREACH detected — orderId={}, externalOrderId={}, temp={}°C (max {}°C)",
                    orderId, order.getExternalOrderId(), temp, COLD_CHAIN_MAX_TEMP_CELSIUS);
        }

        LabOrder saved = labOrderRepository.save(order);
        log.debug("Temp reading logged — orderId={}, temp={}°C, breached={}",
                orderId, temp, saved.isColdChainBreached());

        return LabOrderResponse.from(saved);
    }
}
