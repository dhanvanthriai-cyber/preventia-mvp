package com.dhanvanthri.appointment.controller;

import com.dhanvanthri.appointment.dto.AppointmentResponse;
import com.dhanvanthri.appointment.dto.CreateAppointmentRequest;
import com.dhanvanthri.appointment.service.AppointmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for the Appointment module.
 *
 * Security model:
 *  - POST /api/v1/appointments        — DOCTOR or SPONSOR can schedule
 *  - PUT  /api/v1/appointments/{id}/activate — DOCTOR only (room is live)
 *  - POST /api/v1/webhook/daily       — public endpoint (no auth) for Daily.co callbacks
 *
 * The webhook path must be added to SecurityConfig's permitAll() list:
 *   .requestMatchers("/api/v1/webhook/daily").permitAll()
 */
@RestController
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    // -------------------------------------------------------------------------
    // Schedule a new appointment
    // -------------------------------------------------------------------------

    @PostMapping("/api/v1/appointments")
    @PreAuthorize("hasAnyRole('DOCTOR', 'SPONSOR')")
    public ResponseEntity<AppointmentResponse> createAppointment(
            @RequestBody CreateAppointmentRequest request) {

        AppointmentResponse response = appointmentService.createAppointment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
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
        appointmentService.handleDailyWebhook(payload);
        return ResponseEntity.ok().build();
    }
}
