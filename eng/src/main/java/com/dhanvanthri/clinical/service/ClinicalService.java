package com.dhanvanthri.clinical.service;

import com.dhanvanthri.appointment.domain.Appointment;
import com.dhanvanthri.appointment.domain.AppointmentStatus;
import com.dhanvanthri.appointment.repository.AppointmentRepository;
import com.dhanvanthri.clinical.domain.SoapNote;
import com.dhanvanthri.clinical.dto.SoapNoteRequest;
import com.dhanvanthri.clinical.dto.SoapNoteResponse;
import com.dhanvanthri.clinical.repository.SoapNoteRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Business logic for clinical records (SOAP notes).
 *
 * Session-lock design (Phase 2):
 *  1. STATUS LOCK   — write-access is permitted only when the appointment is ACTIVE.
 *  2. TEMPORAL LOCK — write-access is further constrained to the scheduled session window
 *                     [startTime, endTime], preventing backdating or future-dating.
 *
 * Both locks are enforced in {@link #createSoapNote(Long, SoapNoteRequest, String)}.
 */
@Service
@Transactional
public class ClinicalService {

    private final SoapNoteRepository soapNoteRepo;
    private final AppointmentRepository appointmentRepository;

    public ClinicalService(SoapNoteRepository soapNoteRepo,
                           AppointmentRepository appointmentRepository) {
        this.soapNoteRepo            = soapNoteRepo;
        this.appointmentRepository   = appointmentRepository;
    }

    // -------------------------------------------------------------------------
    // SOAP Note creation — session-locked
    // -------------------------------------------------------------------------

    /**
     * Creates a SOAP note scoped to a specific teleconsultation session.
     *
     * Enforces two independent access guards before any write is permitted:
     *
     * <ol>
     *   <li><b>Session Lock</b> — the appointment must be in the {@code ACTIVE} state,
     *       meaning the Daily.co room is live and the doctor is present.</li>
     *   <li><b>Temporal Lock</b> — the wall-clock time must fall within the appointment's
     *       scheduled [startTime, endTime] window to prevent backdating.</li>
     * </ol>
     *
     * @param appointmentId    the appointment this note belongs to
     * @param request          the SOAP note content
     * @param currentUserEmail the authenticated user's email (for audit trail)
     * @return the persisted SOAP note response DTO
     * @throws EntityNotFoundException if the appointment doesn't exist
     * @throws AccessDeniedException   if either lock condition is violated
     */
    public SoapNoteResponse createSoapNote(Long appointmentId,
                                           SoapNoteRequest request,
                                           String currentUserEmail) {

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new EntityNotFoundException("Appointment not found: " + appointmentId));

        // SESSION LOCK: EMR write-access only when appointment is ACTIVE
        if (appointment.getStatus() != AppointmentStatus.ACTIVE) {
            throw new AccessDeniedException(
                    "EMR write-access requires an ACTIVE appointment session (current status: "
                    + appointment.getStatus() + ")");
        }

        // TEMPORAL LOCK: Must be within the session window
        OffsetDateTime now = OffsetDateTime.now();
        if (now.isBefore(appointment.getStartTime()) || now.isAfter(appointment.getEndTime())) {
            throw new AccessDeniedException(
                    "EMR write-access is only permitted during the scheduled session window ("
                    + appointment.getStartTime() + " – " + appointment.getEndTime() + ")");
        }

        // --- Proceed with creating the SOAP note ---
        SoapNote note = new SoapNote();
        // TODO: map fields from request via setters / ModelMapper once Lombok is added
        //       e.g. note.setSubjective(request.subjective());
        //            note.setAppointmentId(appointmentId);
        //            note.setAuthorEmail(currentUserEmail);
        SoapNote saved = soapNoteRepo.save(note);
        return toResponse(saved);
    }

    // -------------------------------------------------------------------------
    // Legacy entry-point (kept for backward compatibility; prefer createSoapNote)
    // -------------------------------------------------------------------------

    /**
     * @deprecated Use {@link #createSoapNote(Long, SoapNoteRequest, String)} instead.
     *             This stub does not enforce session locks.
     */
    @Deprecated(since = "phase-2", forRemoval = true)
    public SoapNote createNote(SoapNoteRequest req) {
        SoapNote note = new SoapNote();
        // TODO: map fields via ModelMapper or manual setters after Lombok is added
        return soapNoteRepo.save(note);
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<SoapNote> getPatientHistory(Long patientId) {
        return soapNoteRepo.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private SoapNoteResponse toResponse(SoapNote note) {
        // TODO: map entity fields to response record once SoapNote fields are populated
        return new SoapNoteResponse(note.getId());
    }
}
