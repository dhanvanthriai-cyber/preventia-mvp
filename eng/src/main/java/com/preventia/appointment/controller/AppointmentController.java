package com.preventia.appointment.controller;

import com.preventia.appointment.dto.AppointmentResponse;
import com.preventia.appointment.dto.CreateAppointmentRequest;
import com.preventia.appointment.service.AppointmentService;
import com.preventia.ops.service.WebhookEventLogService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/**
 * REST controller for the Appointment module.
 *
 * Security model:
 *  - POST /api/v1/appointments        — DOCTOR, SPONSOR, or RECIPIENT can schedule
 *  - PUT  /api/v1/appointments/{id}/activate — DOCTOR only (room is live)
 *  - POST /api/v1/webhook/daily       — public endpoint (no auth) for Daily.co callbacks
 *
 * The webhook path must be added to SecurityConfig's permitAll() list:
 *   .requestMatchers("/api/v1/webhook/daily").permitAll()
 */
@RestController
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final WebhookEventLogService webhookEventLogService;

    public AppointmentController(AppointmentService appointmentService,
                                 WebhookEventLogService webhookEventLogService) {
        this.appointmentService = appointmentService;
        this.webhookEventLogService = webhookEventLogService;
    }

    // -------------------------------------------------------------------------
    // List appointments
    // -------------------------------------------------------------------------

    @GetMapping("/api/v1/appointments")
    @PreAuthorize("hasAnyRole('DOCTOR', 'SPONSOR', 'RECIPIENT', 'PHARMACIST')")
    public ResponseEntity<List<AppointmentResponse>> getAppointments(
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) Long sponsorId,
            @RequestParam(required = false) Long recipientId) {
        return ResponseEntity.ok(appointmentService.getAppointments(doctorId, sponsorId, recipientId));
    }

    // -------------------------------------------------------------------------
    // Schedule a new appointment
    // -------------------------------------------------------------------------

    @PostMapping("/api/v1/appointments")
    @PreAuthorize("hasAnyRole('DOCTOR', 'SPONSOR', 'RECIPIENT')")
    public ResponseEntity<AppointmentResponse> createAppointment(
            @RequestBody CreateAppointmentRequest request) {

        AppointmentResponse response = appointmentService.createAppointment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // -------------------------------------------------------------------------
    // Re-issue Daily.co tokens
    // -------------------------------------------------------------------------

    /**
     * GET /api/v1/appointments/{id}/tokens
     *
     * Re-issues fresh Daily.co meeting tokens for an existing appointment.
     * Tokens are never stored in the DB — this endpoint re-generates them
     * on demand using the stored room name and participant IDs.
     *
     * Used by the frontend consult pages to obtain tokens after page load
     * (the initial creation response is not persisted client-side).
     */
    @GetMapping("/api/v1/appointments/{id}/tokens")
    @PreAuthorize("hasAnyRole('DOCTOR', 'RECIPIENT', 'SPONSOR')")
    public ResponseEntity<AppointmentResponse> getAppointmentTokens(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.getTokens(id));
    }

    // -------------------------------------------------------------------------
    // Activate (room goes live)
    // -------------------------------------------------------------------------

    @PutMapping("/api/v1/appointments/{id}/activate")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<AppointmentResponse> activateAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.activateAppointment(id));
    }

    @PutMapping("/api/v1/appointments/{id}/complete")
    @PreAuthorize("hasAnyRole('DOCTOR','SPONSOR')")
    public ResponseEntity<AppointmentResponse> completeAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.completeAppointment(id));
    }

    @PutMapping("/api/v1/appointments/{id}/lock")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<AppointmentResponse> lockAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.lockAppointment(id));
    }

    // -------------------------------------------------------------------------
    // Daily.co webhook — public, no authentication required
    // -------------------------------------------------------------------------

    /**
     * Receives Daily.co room lifecycle events (meeting.started, meeting.ended, etc.).
     *
     * Daily.co sends an HMAC-signed POST; signature verification should be added
     * here once the shared secret is wired into application.yml.
     *
     * @param payload raw JSON body forwarded as a generic map
     * @return 200 OK to acknowledge receipt (Daily.co retries on non-2xx)
     */
    @PostMapping("/api/v1/webhook/daily")
    public ResponseEntity<Void> handleDailyWebhook(@RequestBody Map<String, Object> payload) {
        String action = String.valueOf(payload.getOrDefault("action", "unknown"));
        String roomName = extractRoomName(payload);
        String summary = "action=" + action + (roomName.isBlank() ? "" : ", room=" + roomName);

        try {
            appointmentService.handleDailyWebhook(payload);
            webhookEventLogService.record("DAILY", "/api/v1/webhook/daily", action, roomName, roomName, 200, null, summary);
            return ResponseEntity.ok().build();
        } catch (RuntimeException ex) {
            webhookEventLogService.record("DAILY", "/api/v1/webhook/daily", action, roomName, roomName, 500, null, summary);
            throw ex;
        }
    }

    @SuppressWarnings("unchecked")
    private String extractRoomName(Map<String, Object> payload) {
        Object room = payload.get("room");
        if (room instanceof Map<?, ?> roomMap) {
            Object name = ((Map<String, Object>) roomMap).get("name");
            if (name != null) {
                return String.valueOf(name);
            }
        }
        return "";
    }
}
