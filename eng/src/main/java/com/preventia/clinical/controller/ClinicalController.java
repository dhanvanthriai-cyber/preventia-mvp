package com.preventia.clinical.controller;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.chat.service.StreamChatService;
import com.preventia.clinical.dto.SoapNoteRequest;
import com.preventia.clinical.dto.SoapNoteResponse;
import com.preventia.clinical.domain.SoapNote;
import com.preventia.clinical.service.ClinicalService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/clinical")
public class ClinicalController {

    private final ClinicalService       clinicalService;
    private final AppointmentRepository appointmentRepository;
    private final StreamChatService     streamChatService;

    public ClinicalController(ClinicalService clinicalService,
                              AppointmentRepository appointmentRepository,
                              StreamChatService streamChatService) {
        this.clinicalService       = clinicalService;
        this.appointmentRepository = appointmentRepository;
        this.streamChatService     = streamChatService;
    }

    /**
     * DOCTOR creates a SOAP note during an ACTIVE virtual session.
     * Session-lock and temporal-lock are enforced in ClinicalService.
     */
    @PostMapping("/appointments/{appointmentId}/notes")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('DOCTOR')")
    public SoapNoteResponse createNote(
            @PathVariable Long appointmentId,
            @Valid @RequestBody SoapNoteRequest request,
            Authentication authentication) {
        return clinicalService.createSoapNote(appointmentId, request, authentication.getName());
    }

    /** DOCTOR or SPONSOR (with GRANTED consent) reads patient history. */
    @GetMapping("/notes/patient/{patientId}")
    @PreAuthorize("hasRole('DOCTOR') or hasRole('SPONSOR')")
    public List<SoapNote> getPatientHistory(@PathVariable Long patientId) {
        return clinicalService.getPatientHistory(patientId);
    }

    // -------------------------------------------------------------------------
    // CONSULT-003: SOAP note pre-population from patient chat context
    // -------------------------------------------------------------------------

    /**
     * GET /api/v1/clinical/appointments/{appointmentId}/soap-prefill
     *
     * Returns the last 3 patient messages from their async chat channel,
     * for pre-populating the SOAP note Subjective field.
     *
     * Response: { "patientMessages": ["msg1", "msg2"], "flaggedMessages": [] }
     */
    @GetMapping("/appointments/{appointmentId}/soap-prefill")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<Map<String, Object>> getSoapPrefill(
            @PathVariable Long appointmentId) {

        Appointment appt = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new EntityNotFoundException("Appointment not found: " + appointmentId));

        // Fetch last 3 messages sent by the patient before the appointment start
        List<String> patientMessages = streamChatService.getRecentPatientMessages(
            appt.getDoctorId(),
            appt.getRecipientId(),
            appt.getStartTime(),
            3
        );

        Map<String, Object> result = new HashMap<>();
        result.put("patientMessages",  patientMessages);
        result.put("flaggedMessages",  List.of()); // future: fetch in-call flagged messages
        result.put("appointmentId",    appointmentId);

        return ResponseEntity.ok(result);
    }
}


