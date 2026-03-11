package com.dhanvanthri.appointment.service;

import com.dhanvanthri.appointment.domain.Appointment;
import com.dhanvanthri.appointment.domain.AppointmentStatus;
import com.dhanvanthri.appointment.dto.AppointmentResponse;
import com.dhanvanthri.appointment.dto.CreateAppointmentRequest;
import com.dhanvanthri.appointment.repository.AppointmentRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business logic layer for the Appointment module.
 *
 * Status transitions are intentionally explicit (no generic setStatus API)
 * to make the state machine legible and auditable.
 */
@Service
@Transactional
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;

    public AppointmentService(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * Persist a new appointment from the scheduling request.
     * Initial status is always SCHEDULED.
     *
     * @param request validated inbound DTO
     * @return response DTO containing the persisted entity's id and state
     */
    public AppointmentResponse createAppointment(CreateAppointmentRequest request) {
        Appointment appointment = new Appointment(
                request.recipientId(),
                request.sponsorId(),
                request.doctorId(),
                request.startTime(),
                request.endTime(),
                request.dailyRoomUrl(),
                request.dailyRoomName()
        );
        Appointment saved = appointmentRepository.save(appointment);
        return toResponse(saved);
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
        return toResponse(appointment);
    }

    /**
     * Mark an appointment COMPLETED — called when the session ends normally.
     */
    public AppointmentResponse completeAppointment(Long appointmentId) {
        Appointment appointment = findOrThrow(appointmentId);
        appointment.setStatus(AppointmentStatus.COMPLETED);
        return toResponse(appointment);
    }

    /**
     * Lock an appointment — revokes EMR write-access and archives the session.
     * Can be triggered manually by a doctor or automatically by a Daily.co
     * webhook when the room is destroyed.
     */
    public AppointmentResponse lockAppointment(Long appointmentId) {
        Appointment appointment = findOrThrow(appointmentId);
        appointment.setStatus(AppointmentStatus.LOCKED);
        return toResponse(appointment);
    }

    // -------------------------------------------------------------------------
    // Webhook delegation entry-point
    // -------------------------------------------------------------------------

    /**
     * Process an inbound Daily.co webhook event payload.
     *
     * Currently handles:
     *   - "meeting.ended"  → locks the appointment
     *   - "meeting.started"→ activates the appointment (belt-and-suspenders fallback)
     *
     * @param payload raw event body forwarded from {@link com.dhanvanthri.appointment.controller.AppointmentController}
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
            // @Transactional on the service class means the dirty-check will flush automatically
        });
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Appointment findOrThrow(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Appointment not found: " + id));
    }

    /** Map entity → response DTO. */
    private AppointmentResponse toResponse(Appointment a) {
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
                a.getCreatedAt()
        );
    }
}
