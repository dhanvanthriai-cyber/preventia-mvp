package com.preventia.appointment.controller;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.dto.AppointmentResponse;
import com.preventia.appointment.dto.CreateAppointmentRequest;
import com.preventia.appointment.dto.UpdateAppointmentStatusRequest;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.appointment.service.AppointmentService;
import com.preventia.auth.repository.UserRepository;
import com.preventia.chat.service.ChatNotificationService;
import com.preventia.family.domain.User;
import com.preventia.ops.service.WebhookEventLogService;
import com.preventia.shared.service.MailService;
import com.preventia.shared.service.PushNotificationService;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(AppointmentController.class);

    private final AppointmentService      appointmentService;
    private final AppointmentRepository   appointmentRepository;
    private final WebhookEventLogService  webhookEventLogService;
    private final ChatNotificationService chatNotificationService;
    private final PushNotificationService pushNotificationService;
    private final MailService             mailService;
    private final UserRepository          userRepository;

    public AppointmentController(AppointmentService appointmentService,
                                 AppointmentRepository appointmentRepository,
                                 WebhookEventLogService webhookEventLogService,
                                 ChatNotificationService chatNotificationService,
                                 PushNotificationService pushNotificationService,
                                 MailService mailService,
                                 UserRepository userRepository) {
        this.appointmentService      = appointmentService;
        this.appointmentRepository   = appointmentRepository;
        this.webhookEventLogService  = webhookEventLogService;
        this.chatNotificationService = chatNotificationService;
        this.pushNotificationService = pushNotificationService;
        this.mailService             = mailService;
        this.userRepository          = userRepository;
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
    @PreAuthorize("hasAnyRole('DOCTOR', 'RECIPIENT', 'SPONSOR')")
    public ResponseEntity<AppointmentResponse> activateAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.activateAppointment(id));
    }

    @PutMapping("/api/v1/appointments/{id}/complete")
    @PreAuthorize("hasAnyRole('DOCTOR', 'RECIPIENT', 'SPONSOR')")
    public ResponseEntity<AppointmentResponse> completeAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.completeAppointment(id));
    }

    @PutMapping("/api/v1/appointments/{id}/status")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<AppointmentResponse> updateAppointmentStatus(
            @PathVariable Long id,
            @RequestBody UpdateAppointmentStatusRequest request) {
        return ResponseEntity.ok(appointmentService.updateAppointmentStatus(id, request.status()));
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
    // -------------------------------------------------------------------------
    // CONSULT-010: Emergency Escalation
    // -------------------------------------------------------------------------

    /**
     * POST /api/v1/appointments/{id}/emergency
     *
     * Triggered by patient or sponsor when an in-call emergency occurs.
     * 1. Sends urgent Stream message to doctor channel
     * 2. Sends FCM high-priority push to doctor
     * 3. Logs EMERGENCY_ESCALATED event
     * 4. Emails clinic admin (async, best-effort within 60s)
     */
    @PostMapping("/api/v1/appointments/{id}/emergency")
    @PreAuthorize("hasAnyRole('RECIPIENT', 'SPONSOR')")
    public ResponseEntity<Void> triggerEmergency(@PathVariable Long id) {
        Appointment appt = appointmentRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Appointment not found: " + id));

        String patientName = userRepository.findById(appt.getRecipientId())
            .map(User::getName).orElse("Patient");
        String doctorName  = userRepository.findById(appt.getDoctorId())
            .map(User::getName).orElse("Doctor");

        // 1. Send urgent Stream chat message
        chatNotificationService.sendEmergencyEscalation(
            appt.getDoctorId(), appt.getRecipientId(), patientName
        );

        // 2. FCM high-priority push to doctor (STUB unless firebase enabled)
        pushNotificationService.send(
            null, // FCM token would be looked up from device registry in production
            "⚠️ EMERGENCY ESCALATION",
            patientName + " triggered an emergency during consultation",
            true,
            Map.of("appointmentId", String.valueOf(id), "type", "EMERGENCY")
        );

        // 3. Log to webhook event log as EMERGENCY_ESCALATED
        webhookEventLogService.record(
            "INTERNAL", "/api/v1/appointments/" + id + "/emergency",
            "EMERGENCY_ESCALATED", null, null, 200, true,
            "Patient " + patientName + " triggered emergency for appt " + id
        );

        // 4. Email admin (async / best-effort — non-fatal)
        Thread.ofVirtual().start(() -> {
            try {
                mailService.sendAdminAlert(
                    "EMERGENCY ESCALATION — Appointment #" + id,
                    "Patient " + patientName + " triggered the emergency button during " +
                    "consultation with Dr. " + doctorName + ".\n\n" +
                    "Appointment ID: " + id + "\n" +
                    "Please contact the clinic immediately."
                );
            } catch (Exception e) {
                log.error("[Emergency] Admin email failed for appt {}: {}", id, e.getMessage());
            }
        });

        log.warn("[Emergency] CONSULT-010 triggered: apptId={} patient={}", id, patientName);
        return ResponseEntity.ok().build();
    }

    // -------------------------------------------------------------------------
    // CONSULT-006: Chat fallback flag
    // -------------------------------------------------------------------------

    /**
     * PUT /api/v1/appointments/{id}/flag-chat-fallback
     *
     * Called by frontend after 3 failed video join attempts.
     * Logs the CHAT_FALLBACK event and notifies the doctor via push + chat message.
     */
    @PutMapping("/api/v1/appointments/{id}/flag-chat-fallback")
    @PreAuthorize("hasAnyRole('RECIPIENT', 'SPONSOR', 'DOCTOR')")
    public ResponseEntity<Void> flagChatFallback(@PathVariable Long id) {
        Appointment appt = appointmentRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Appointment not found: " + id));

        String patientName = userRepository.findById(appt.getRecipientId())
            .map(User::getName).orElse("Patient");

        // Notify doctor via chat
        chatNotificationService.sendChatFallbackNotification(
            appt.getDoctorId(), appt.getRecipientId(), patientName
        );

        // FCM push to doctor
        pushNotificationService.send(
            null,
            "📵 Patient on chat-only",
            patientName + " is having video issues — switch to chat",
            false,
            Map.of("appointmentId", String.valueOf(id), "type", "CHAT_FALLBACK")
        );

        // Log event
        webhookEventLogService.record(
            "INTERNAL", "/api/v1/appointments/" + id + "/flag-chat-fallback",
            "CHAT_FALLBACK", null, null, 200, true,
            "Patient " + patientName + " switched to chat fallback for appt " + id
        );

        log.info("[ChatFallback] CONSULT-006: apptId={} patient={}", id, patientName);
        return ResponseEntity.ok().build();
    }

    // -------------------------------------------------------------------------
    // Daily.co webhook — public, no authentication required
    // -------------------------------------------------------------------------

    /**
     * Receives Daily.co room lifecycle events (meeting.started, meeting.ended, etc.).
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
