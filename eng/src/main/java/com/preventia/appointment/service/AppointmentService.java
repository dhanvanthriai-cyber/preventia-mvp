package com.preventia.appointment.service;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.domain.AppointmentStatus;
import com.preventia.appointment.dto.AppointmentResponse;
import com.preventia.appointment.dto.CreateAppointmentRequest;
import com.preventia.appointment.dto.DailyRoomProvisionResult;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.auth.repository.UserRepository;
import com.preventia.chat.service.ChatNotificationService;
import com.preventia.family.domain.User;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import java.util.List;
import java.util.stream.Collectors;

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

    private final AppointmentRepository  appointmentRepository;
    private final DailyRoomService       dailyRoomService;
    private final UserRepository         userRepository;
    private final ChatNotificationService chatNotificationService;

    public AppointmentService(AppointmentRepository appointmentRepository,
                              DailyRoomService dailyRoomService,
                              UserRepository userRepository,
                              ChatNotificationService chatNotificationService) {
        this.appointmentRepository    = appointmentRepository;
        this.dailyRoomService         = dailyRoomService;
        this.userRepository           = userRepository;
        this.chatNotificationService  = chatNotificationService;
    }

    // -------------------------------------------------------------------------
    // Query
    // -------------------------------------------------------------------------

    /**
     * Returns appointments filtered by one of: doctorId, sponsorId, or recipientId.
     * At least one param must be non-null; doctorId takes priority.
     */
    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointments(Long doctorId, Long sponsorId, Long recipientId) {
        List<Appointment> results;
        if (doctorId != null) {
            results = appointmentRepository.findByDoctorId(doctorId);
        } else if (sponsorId != null) {
            results = appointmentRepository.findBySponsorId(sponsorId);
        } else if (recipientId != null) {
            results = appointmentRepository.findByRecipientId(recipientId);
        } else {
            results = appointmentRepository.findAll();
        }
        return results.stream().map(a -> toResponse(a, null)).collect(Collectors.toList());
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
        // Persist name snapshots for historical accuracy (consultation-history view)
        saved.setDoctorName(request.doctorName());
        saved.setRecipientName(request.recipientName());
        // @Transactional dirty-check will flush the update automatically

        // Step 4: Send appointment confirmation via Stream Chat (best-effort)
        chatNotificationService.sendAppointmentConfirmation(
            request.doctorId(),
            request.recipientId(),
            saved.getId(),
            request.doctorName(),
            request.startTime()
        );

        return toResponse(saved, room);
    }

    // -------------------------------------------------------------------------
    // State transitions
    // -------------------------------------------------------------------------

    /**
     * Mark an appointment ACTIVE — called when the Daily.co room goes live.
     * VIDEO-002: If the appointment has a sponsor, fetch their token and send the join link
     * to the sponsor-doctor channel.
     */
    public AppointmentResponse activateAppointment(Long appointmentId) {
        Appointment appointment = findOrThrow(appointmentId);
        appointment.setStatus(AppointmentStatus.ACTIVE);

        // VIDEO-002: Send sponsor observer join link when consultation goes ACTIVE
        if (appointment.getSponsorId() != null) {
            try {
                String patientName = userRepository.findById(appointment.getRecipientId())
                    .map(User::getName).orElse("the patient");
                String doctorName = userRepository.findById(appointment.getDoctorId())
                    .map(User::getName).orElse("the doctor");
                String sponsorName = userRepository.findById(appointment.getSponsorId())
                    .map(User::getName).orElse("Sponsor");

                // Re-issue tokens to get the sponsor token
                DailyRoomProvisionResult tokens = dailyRoomService.issueTokens(
                    appointment.getDailyRoomName(),
                    appointment.getEndTime(),
                    appointment.getDoctorId(),    doctorName,
                    appointment.getRecipientId(), patientName,
                    appointment.getSponsorId(),   sponsorName
                );

                chatNotificationService.sendSponsorJoinLink(
                    appointment.getId(),
                    appointment.getSponsorId(),
                    appointment.getDoctorId(),
                    patientName,
                    doctorName,
                    appointment.getDailyRoomUrl(),
                    tokens.sponsorToken()
                );
            } catch (Exception e) {
                log.warn("[AppointmentService] Failed to send sponsor join link for appt {}: {}",
                    appointmentId, e.getMessage());
            }
        }

        return toResponse(appointment, null);
    }

    private static final org.slf4j.Logger log =
        org.slf4j.LoggerFactory.getLogger(AppointmentService.class);

    /**
     * Cancel an appointment before it starts.
     */
    public AppointmentResponse cancelAppointment(Long appointmentId) {
        Appointment appointment = findOrThrow(appointmentId);
        appointment.setStatus(AppointmentStatus.CANCELLED);
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

    /**
     * Compatibility endpoint for the web dashboard's approve / decline flow.
     * Maps a requested status to the corresponding explicit transition.
     */
    public AppointmentResponse updateAppointmentStatus(Long appointmentId, AppointmentStatus requestedStatus) {
        if (requestedStatus == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Appointment status is required");
        }

        return switch (requestedStatus) {
            case ACTIVE -> activateAppointment(appointmentId);
            case CANCELLED -> cancelAppointment(appointmentId);
            case COMPLETED -> completeAppointment(appointmentId);
            case LOCKED -> lockAppointment(appointmentId);
            case SCHEDULED -> throw new ResponseStatusException(BAD_REQUEST, "Cannot transition an appointment back to SCHEDULED");
        };
    }

    // -------------------------------------------------------------------------
    // Token re-issuance
    // -------------------------------------------------------------------------

    /**
     * Re-issues fresh Daily.co meeting tokens for an existing appointment.
     *
     * Tokens are NOT stored in the DB (they are issued once at creation and
     * never persisted). This endpoint allows the frontend to fetch fresh tokens
     * at any time using the stored room name and participant IDs.
     *
     * @param appointmentId DB primary key
     * @return AppointmentResponse with fresh doctorToken, recipientToken (and sponsorToken if applicable)
     */
    @Transactional(readOnly = true)
    public AppointmentResponse getTokens(Long appointmentId) {
        Appointment appt = findOrThrow(appointmentId);

        // Look up display names from the users table
        String doctorName    = userRepository.findById(appt.getDoctorId())
                .map(User::getName).orElse("Doctor");
        String recipientName = userRepository.findById(appt.getRecipientId())
                .map(User::getName).orElse("Patient");

        String sponsorName = null;
        if (appt.getSponsorId() != null) {
            sponsorName = userRepository.findById(appt.getSponsorId())
                    .map(User::getName).orElse("Sponsor");
        }

        DailyRoomProvisionResult tokens = dailyRoomService.issueTokens(
                appt.getDailyRoomName(),
                appt.getEndTime(),
                appt.getDoctorId(),    doctorName,
                appt.getRecipientId(), recipientName,
                appt.getSponsorId(),   sponsorName
        );

        return toResponse(appt, tokens);
    }

    // -------------------------------------------------------------------------
    // Webhook delegation entry-point
    // -------------------------------------------------------------------------

    /**
     * Process an inbound Daily.co webhook event payload.
     *
     * Currently handles:
     *   - "meeting-ended"   → locks the appointment (primary EMR lock trigger)
     *   - "meeting-started" → activates the appointment (fallback / belt-and-suspenders)
     *
     * @param payload raw event body forwarded from AppointmentController
     */
    public void handleDailyWebhook(java.util.Map<String, Object> payload) {
        String eventType = String.valueOf(payload.getOrDefault("action", ""));

        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> room =
                (java.util.Map<String, Object>) payload.getOrDefault("room", java.util.Collections.emptyMap());

        String roomName = String.valueOf(room.getOrDefault("name", ""));
        if (roomName.trim().isEmpty()) return;

        appointmentRepository.findByDailyRoomName(roomName).ifPresent(appt -> {
            switch (eventType) {
                case "meeting-started" -> appt.setStatus(AppointmentStatus.ACTIVE);
                case "meeting-ended"   -> appt.setStatus(AppointmentStatus.LOCKED);
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
                a.getDoctorName(),
                a.getRecipientName(),
                room != null ? room.doctorToken()    : null,
                room != null ? room.recipientToken() : null,
                room != null ? room.sponsorToken()   : null
        );
    }
}
