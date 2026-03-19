package com.preventia.lab.controller;

import com.preventia.lab.dto.CreateLabOrderRequest;
import com.preventia.lab.dto.LabOrderResponse;
import com.preventia.lab.service.LabOrderService;
import com.preventia.ops.service.WebhookEventLogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for lab order management.
 *
 * Endpoints:
 *   POST   /api/v1/lab-orders             — Doctor creates a new order
 *   POST   /api/v1/webhook/lab            — Thyrocare webhook (public, no JWT)
 *   PUT    /api/v1/lab-orders/{id}/temp   — Log temperature reading (Doctor or Pharmacist)
 */
@RestController
public class LabOrderController {

    private final LabOrderService labOrderService;
    private final WebhookEventLogService webhookEventLogService;

    public LabOrderController(LabOrderService labOrderService,
                              WebhookEventLogService webhookEventLogService) {
        this.labOrderService = labOrderService;
        this.webhookEventLogService = webhookEventLogService;
    }

    // -------------------------------------------------------------------------
    // POST /api/v1/lab-orders — DOCTOR only
    // -------------------------------------------------------------------------

    /**
     * Place a new lab order and submit to Thyrocare.
     *
     * @param request validated order request body
     * @return 201 Created with LabOrderResponse (includes externalOrderId + trackingId)
     */
    @PostMapping("/api/v1/lab-orders")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('DOCTOR')")
    public LabOrderResponse createOrder(@Valid @RequestBody CreateLabOrderRequest request) {
        return labOrderService.createOrder(request);
    }

    // -------------------------------------------------------------------------
    // POST /api/v1/webhook/lab — PUBLIC (no JWT, listed in SecurityConfig.permitAll)
    // -------------------------------------------------------------------------

    /**
     * Thyrocare webhook receiver.
     * Expected payload: {@code { "externalOrderId": "...", "event": "sample_collected" }}
     *
     * Events handled: {@code sample_collected}, {@code results_ready}
     *
     * @param payload webhook JSON body
     * @return 200 OK on success
     */
    @PostMapping("/api/v1/webhook/lab")
    public ResponseEntity<Map<String, String>> handleLabWebhook(@RequestBody Map<String, String> payload) {
        String externalOrderId = payload.get("externalOrderId");
        String event = payload.get("event");
        String summary = "event=" + event + (externalOrderId == null ? "" : ", externalOrderId=" + externalOrderId);

        try {
            labOrderService.handleWebhook(externalOrderId, event);
            webhookEventLogService.record("THYROCARE", "/api/v1/webhook/lab", event, externalOrderId, null, 200, null, summary);
            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (IllegalArgumentException ex) {
            webhookEventLogService.record("THYROCARE", "/api/v1/webhook/lab", event, externalOrderId, null, 400, null, summary);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // PUT /api/v1/lab-orders/{id}/temp — DOCTOR or PHARMACIST
    // -------------------------------------------------------------------------

    /**
     * Log a cold-chain temperature reading for a lab order.
     * Temperatures above 8°C on cold-chain orders will trigger a breach flag.
     *
     * @param id   lab order DB ID
     * @param body JSON body with {@code "temp"} field (float, °C)
     * @return updated LabOrderResponse
     */
    @PutMapping("/api/v1/lab-orders/{id}/temp")
    @PreAuthorize("hasAnyRole('DOCTOR','PHARMACIST')")
    public LabOrderResponse updateTempReading(
            @PathVariable Long id,
            @RequestBody Map<String, Float> body) {
        float temp = body.get("temp");
        return labOrderService.updateTempReading(id, temp);
    }
}
