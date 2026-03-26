package com.preventia.clinical.controller;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.domain.AppointmentStatus;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.auth.repository.UserRepository;
import com.preventia.chat.service.ChatNotificationService;
import com.preventia.chat.service.StreamChatService;
import com.preventia.clinical.dto.SoapNoteRequest;
import com.preventia.clinical.dto.SoapNoteResponse;
import com.preventia.clinical.domain.SoapNote;
import com.preventia.clinical.repository.SoapNoteRepository;
import com.preventia.clinical.service.ClinicalService;
import com.preventia.family.domain.User;
import com.preventia.lab.domain.LabOrderStatus;
import com.preventia.lab.repository.LabOrderRepository;
import com.preventia.shared.service.S3Service;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/clinical")
public class ClinicalController {

    private static final DateTimeFormatter DATE_FMT =
        DateTimeFormatter.ofPattern("dd MMM yyyy").withZone(ZoneId.of("Asia/Kolkata"));

    private final ClinicalService       clinicalService;
    private final AppointmentRepository appointmentRepository;
    private final StreamChatService     streamChatService;
    private final SoapNoteRepository    soapNoteRepository;
    private final LabOrderRepository    labOrderRepository;
    private final JdbcTemplate          jdbc;
    private final S3Service             s3Service;
    private final UserRepository        userRepository;
    private final ChatNotificationService chatNotificationService;

    public ClinicalController(ClinicalService clinicalService,
                              AppointmentRepository appointmentRepository,
                              StreamChatService streamChatService,
                              SoapNoteRepository soapNoteRepository,
                              LabOrderRepository labOrderRepository,
                              JdbcTemplate jdbc,
                              S3Service s3Service,
                              UserRepository userRepository,
                              ChatNotificationService chatNotificationService) {
        this.clinicalService          = clinicalService;
        this.appointmentRepository    = appointmentRepository;
        this.streamChatService        = streamChatService;
        this.soapNoteRepository       = soapNoteRepository;
        this.labOrderRepository       = labOrderRepository;
        this.jdbc                     = jdbc;
        this.s3Service                = s3Service;
        this.userRepository           = userRepository;
        this.chatNotificationService  = chatNotificationService;
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

    // -------------------------------------------------------------------------
    // CONSULT-001: Unified consultation timeline view
    // -------------------------------------------------------------------------

    /**
     * GET /api/v1/patients/{id}/timeline
     *
     * Aggregates appointments (LOCKED), lab results (RESULTED), and prescription
     * dispatches into a single chronological timeline. Role-filtered.
     */
    @GetMapping("/api/v1/patients/{id}/timeline")
    @PreAuthorize("hasAnyRole('DOCTOR', 'RECIPIENT', 'SPONSOR')")
    public ResponseEntity<List<Map<String, Object>>> getTimeline(
            @PathVariable Long id,
            Authentication auth) {

        String callerEmail = auth.getName();
        User caller = userRepository.findByEmail(callerEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));
        String role = caller.getRole().name();

        List<Map<String, Object>> events = new ArrayList<>();

        // 1. LOCKED appointments
        appointmentRepository.findByRecipientId(id).stream()
            .filter(a -> a.getStatus() == AppointmentStatus.LOCKED)
            .forEach(a -> {
                Map<String, Object> event = new HashMap<>();
                event.put("type",          "APPOINTMENT");
                event.put("date",          a.getEndTime() != null ? a.getEndTime().toString() : a.getStartTime().toString());
                event.put("title",         "Consultation with Dr. " + (a.getDoctorName() != null ? a.getDoctorName() : a.getDoctorId()));
                event.put("appointmentId", a.getId());
                // DOCTOR sees SOAP note summary; patient/sponsor see a brief note
                if ("DOCTOR".equals(role)) {
                    soapNoteRepository.findByAppointmentId(a.getId()).stream().findFirst().ifPresent(note -> {
                        event.put("summary", note.getAssessment());
                        event.put("plan",    note.getPlan());
                    });
                }
                events.add(event);
            });

        // 2. Lab results (RESULTED)
        labOrderRepository.findByPatientIdOrderByCreatedAtDesc(id).stream()
            .filter(lo -> lo.getStatus() == LabOrderStatus.RESULTED)
            .forEach(lo -> {
                Map<String, Object> event = new HashMap<>();
                event.put("type",  "LAB_RESULT");
                event.put("date",  lo.getResultedAt() != null ? lo.getResultedAt().toString() : "");
                event.put("title", (lo.getLabPartner() != null ? lo.getLabPartner().name() : "Lab") + " Results");
                if (lo.getResultPdfKey() != null) {
                    try { event.put("signedUrl", s3Service.generatePresignedUrl(lo.getResultPdfKey())); }
                    catch (Exception ignored) {}
                }
                events.add(event);
            });

        // 3. Prescription dispatches
        List<Map<String, Object>> dispatched = jdbc.queryForList("""
            SELECT pal.created_at, sn.doctor_id, sn.patient_id
            FROM prescription_audit_log pal
            JOIN soap_notes sn ON sn.id = pal.soap_note_id
            WHERE sn.patient_id = ? AND pal.action = 'DISPATCHED'
            ORDER BY pal.created_at DESC
            """, id);
        for (Map<String, Object> row : dispatched) {
            Map<String, Object> event = new HashMap<>();
            event.put("type",  "PRESCRIPTION");
            event.put("date",  row.get("created_at") != null ? row.get("created_at").toString() : "");
            event.put("title", "Prescription Dispatched");
            events.add(event);
        }

        // Sort all events by date DESC
        events.sort(Comparator.comparing(
            e -> (String) e.getOrDefault("date", ""),
            Comparator.reverseOrder()
        ));

        return ResponseEntity.ok(events);
    }

    // -------------------------------------------------------------------------
    // CONSULT-008: Second opinion request (P3)
    // -------------------------------------------------------------------------

    /**
     * POST /api/v1/patients/{id}/request-second-opinion
     *
     * Primary doctor invites a specialist to the patient's care team channel
     * and shares a curated SOAP summary (plan + assessment only).
     */
    @PostMapping("/api/v1/patients/{id}/request-second-opinion")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<Map<String, String>> requestSecondOpinion(
            @PathVariable Long id,          // patientId
            @RequestBody Map<String, Long> body,
            Authentication auth) {

        Long specialistId = body.get("specialistId");
        if (specialistId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "specialistId required"));
        }

        // Get most recent SOAP note for this patient
        List<SoapNote> notes = soapNoteRepository.findByPatientIdOrderByCreatedAtDesc(id);
        String summary = notes.isEmpty() ? "No SOAP note available."
            : "Assessment: " + notes.get(0).getAssessment() + "\n\nPlan: " + notes.get(0).getPlan();

        // Share curated summary with specialist via their chat channel
        // The specialist is added to the patient's care team channel
        String specialistName = userRepository.findById(specialistId)
            .map(User::getName).orElse("Specialist #" + specialistId);
        String doctorEmail = auth.getName();
        Long doctorId = userRepository.findByEmail(doctorEmail).map(User::getId).orElse(0L);

        // Send summary as a direct message from doctor to specialist
        chatNotificationService.sendSystemMessage(doctorId, specialistId,
            "🩺 *Second Opinion Request*\n\nPatient ID: " + id +
            "\n\nCurated clinical summary:\n\n" + summary +
            "\n\nPlease review and respond in this channel.");

        return ResponseEntity.ok(Map.of(
            "status",       "sent",
            "specialistId", specialistId.toString()
        ));
    }
}


