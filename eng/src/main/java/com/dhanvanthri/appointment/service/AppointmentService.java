package com.dhanvanthri.appointment.service;

import com.dhanvanthri.appointment.domain.Appointment;
import com.dhanvanthri.appointment.domain.AppointmentStatus;
import com.dhanvanthri.appointment.dto.AppointmentResponse;
import com.dhanvanthri.appointment.dto.CreateAppointmentRequest;
import com.dhanvanthri.appointment.dto.DailyRoomProvisionResult;
import com.dhanvanthri.appointment.repository.AppointmentRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business logic layer for the Appointment module.
 *
 * On appointment creation, DailyRoomService is called to provision a private
 * Daily.co room and generate per-participant meeting tokens. The room URL and
 * name are persisted to the Appointment entity; tokens are returned in the
 * response for immediate client use (they are NOT stored in the DB).
 *
 * Status transitions are intentionally explicit (no generic setStatus API)
 * to make the state machine legible and auditable.
 */
@Service
@Transactional
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final DailyRoomService      dailyRoomService;

    public AppointmentService(AppointmentRepository appointmentRepository,
                              DailyRoomService dailyRoomService) {
        this.appointmentRepository = appointmentRepository;
        this.dailyRoomService      = dailyRoomService;
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * Persist a new appointment and auto-provision a Daily.co video room.
     *
     * Flow:
     *   1. Call DailyRoomService to create the room + issue meeting tokens.
     *   2. Persist the Appointment with the returned room URL + name.
     *   3. Return the full AppointmentResponse including all tokens.
     *
     * The appointment ID used for room naming is derived from the DB-generated
     * primary key — this requires a two-step save (first flush, then provision).
     * We flush first to get the ID, then provision Daily.co, then update the entity.
     *
     * @param request validated inbound DTO
     * @return response DTO containing the persisted entity's id, state, and tokens
     */
    public AppointmentResponse createAppointment(CreateAppointmentRequest request) {
        // Step 1: Persist with placeholder room fields to obtain the DB-generated ID
        Appointment appointment = new Appointment(
                request.recipientId(),
                request.sponsorId(),
                request.doctorId(),
                request.startTime(),
                request.endTime(),
                "pending",   // temporary placeholder — updated after Daily.co call
                "pending"
        );
        Appointment saved = appointmentRepository.saveAndFlush(appointment);

        // Step 2: Provision Daily.co room using the real appointment ID
        String appointmentLabel = String.format("APT-%05d", saved.getId());
        DailyRoomProvisionResult room = dailyRoomService.provision(
                appointmentLabel,
                request.endTime(),
                request.doctorId(),
                request.doctorName(),
                request.recipientId(),
                request.recipientName(),
                request.sponsorId(),
                request.sponsorName()
        );

        // Step 3: Write the real room URL + name back to the persisted entity
        saved.setDailyRoomUrl(room.roomUrl());
        saved.setDailyRoomName(room.roomName());
        // @Transactional dirty-check will flush the update automatically

        return toResponse(saved, room);
    }

    // -------------------------------------------------------------------------
    // State transitions
    // -------------------------------------------------------------------------

    /**
     * Mark an appointment ACTIVE — called when the Daily.co room goes live.
     * This opens EMR write-access for SOAP notes.
     */
    public AppointmentResponse activateAppointment(Long appointmentId) {
        Appointment appointment = findOrThrow(appointmentId);
        appointment.setStatus(AppointmentStatus.ACTIVE);
        return toResponse(appointment, null);
    }

    /**
     * Mark an appointment COMPLETED — called when the session ends normally.
     */
    public AppointmentResponse completeAppointment(Long appointmentId) {
        Appointment appointment = findOrThrow(appointmentId);
        appointment.setStatus(AppointmentStatus.COMPLETED);
        return toResponse(appointment, null);
    }

    /**
     * Lock an appointment — revokes EMR write-access and archives the session.
     * Triggered manually by a doctor or automatically via the Daily.co
     * meeting-ended webhook.
     */
    public AppointmentResponse lockAppointment(Long appointmentId) {
        Appointment appointment = findOrThrow(appointmentId);
        appointment.setStatus(AppointmentStatus.LOCKED);
        return toResponse(appointment, null);
    }

    // -------------------------------------------------------------------------
    // Webhook delegation entry-point
    // -------------------------------------------------------------------------

    /**
     * Process an inbound Daily.co webhook event payload.
     *
     * Currently handles:
     *   - "meeting.ended"   → locks the appointment (primary EMR lock trigger)
     *   - "meeting.started" → activates the appointment (fallback / belt-and-suspenders)
     *
     * @param payload raw event body forwarded from AppointmentController
     */
    public void handleDailyWebhook(java.util.Map<String, Object> payload) {
        String eventType = String.valueOf(payload.getOrDefault("event", ""));

        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> room =
                (java.util.Map<String, Object>) payload.getOrDefault("room", java.util.Collections.emptyMap());

        String roomName = String.valueOf(room.getOrDefault("name", ""));
        if (roomName.isBlank()) return;

        appointmentRepository.findByDailyRoomName(roomName).ifPresent(appt -> {
            switch (eventType) {
                case "meeting.started" -> appt.setStatus(AppointmentStatus.ACTIVE);
                case "meeting.ended"   -> appt.setStatus(AppointmentStatus.LOCKED);
                default                -> { /* unhandled event — ignore */ }
            }
        });
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Appointment findOrThrow(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Appointment not found: " + id));
    }

    /**
     * Map entity → response DTO.
     * room is null for state-transition calls (tokens are one-time at creation).
     */
    private AppointmentResponse toResponse(Appointment a, DailyRoomProvisionResult room) {
        return new AppointmentResponse(
                a.getId(),
                a.getRecipientId(),
                a.getSponsorId(),
                a.getDoctorId(),
                a.getStartTime(),
                a.getEndTime(),
                a.getDailyRoomUrl(),
                a.getDailyRoomName(),
                a.getStatus(),
                a.getCreatedAt(),
                room != null ? room.doctorToken()    : null,
                room != null ? room.recipientToken() : null,
                room != null ? room.sponsorToken()   : null
        );
    }
}
