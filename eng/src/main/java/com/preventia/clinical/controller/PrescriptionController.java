package com.preventia.clinical.controller;

import com.preventia.chat.service.ChatNotificationService;
import com.preventia.clinical.domain.SoapNote;
import com.preventia.clinical.repository.SoapNoteRepository;
import com.preventia.shared.service.S3Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Manages prescription PDF upload, secure access, and pharmacist review actions.
 *
 * Endpoints:
 *  POST /api/v1/appointments/{id}/prescription          — DOCTOR: upload one or more PDFs (multipart)
 *  GET  /api/v1/appointments/{id}/prescription/view     — DOCTOR|SPONSOR|PHARMACIST: presigned URL (primary file)
 *  GET  /api/v1/appointments/{id}/prescription/files    — DOCTOR|SPONSOR|PHARMACIST: presigned URLs for all files
 *  GET  /api/v1/prescriptions/queue                     — PHARMACIST: pending review queue
 *  POST /api/v1/prescriptions/{id}/approve              — PHARMACIST: approve
 *  POST /api/v1/prescriptions/{id}/reject               — PHARMACIST: reject (reason required)
 *  POST /api/v1/prescriptions/{id}/clarify              — PHARMACIST: request clarification
 *
 * Multi-file upload:
 *  Accepts field name "files" (multiple) or legacy "file" (single) — both are valid.
 *  The first file in the batch is stored as the canonical prescription_s3_key.
 *  All keys are stored in prescription_s3_keys (TEXT[]) added in V14.
 *  Max files per upload: 5. Accepted MIME types: application/pdf, image/jpeg, image/png.
 */
@RestController
public class PrescriptionController {

    private static final Logger log = LoggerFactory.getLogger(PrescriptionController.class);

    private final S3Service               s3Service;
    private final SoapNoteRepository      soapNoteRepository;
    private final JdbcTemplate            jdbc;
    private final ChatNotificationService chatNotificationService;

    public PrescriptionController(S3Service s3Service,
                                  SoapNoteRepository soapNoteRepository,
                                  JdbcTemplate jdbc,
                                  ChatNotificationService chatNotificationService) {
        this.s3Service               = s3Service;
        this.soapNoteRepository      = soapNoteRepository;
        this.jdbc                    = jdbc;
        this.chatNotificationService = chatNotificationService;
    }

    // -------------------------------------------------------------------------
    // Upload prescription PDFs (DOCTOR) — supports 1..5 files per request
    // Accepts field name "files" (multi) or legacy "file" (single).
    // -------------------------------------------------------------------------

    private static final int    MAX_FILES          = 5;
    private static final long   MAX_FILE_BYTES     = 10 * 1024 * 1024L; // 10 MB per file
    private static final List<String> ALLOWED_TYPES = List.of(
            "application/pdf", "image/jpeg", "image/png");

    @PostMapping(value = "/api/v1/appointments/{appointmentId}/prescription",
                 consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<Map<String, Object>> uploadPrescription(
            @PathVariable Long appointmentId,
            @RequestParam(name = "files",  required = false) List<MultipartFile> files,
            @RequestParam(name = "file",   required = false) MultipartFile       legacyFile) {

        // ── Normalise: accept either "files" (new) or "file" (legacy) ─────────
        List<MultipartFile> uploads = new ArrayList<>();
        if (files != null) uploads.addAll(files);
        if (legacyFile != null && !legacyFile.isEmpty()) uploads.add(legacyFile);
        if (uploads.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "At least one file is required (field: 'files' or 'file').");
        if (uploads.size() > MAX_FILES)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Maximum " + MAX_FILES + " files per upload. Received: " + uploads.size());

        // ── Validate each file before any S3 write ────────────────────────────
        for (MultipartFile f : uploads) {
            String mime = f.getContentType() != null ? f.getContentType() : "application/octet-stream";
            if (!ALLOWED_TYPES.contains(mime))
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                        "File '" + f.getOriginalFilename() + "' has unsupported type: " + mime
                        + ". Allowed: " + ALLOWED_TYPES);
            if (f.getSize() > MAX_FILE_BYTES)
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                        "File '" + f.getOriginalFilename() + "' exceeds the 10 MB limit.");
        }

        SoapNote note = soapNoteRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No SOAP note for appointment " + appointmentId));

        // ── Upload all files; roll back on first failure via exception ─────────
        List<String> uploadedKeys = new ArrayList<>();
        for (int i = 0; i < uploads.size(); i++) {
            MultipartFile f = uploads.get(i);
            byte[] bytes;
            try { bytes = f.getBytes(); }
            catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Failed to read file[" + i + "]: " + e.getMessage());
            }
            String fileName = (f.getOriginalFilename() != null && !f.getOriginalFilename().isBlank())
                    ? f.getOriginalFilename()
                    : "prescription-" + (i + 1) + ".pdf";
            String key = s3Service.uploadFile(
                    "prescriptions/" + appointmentId,
                    fileName,
                    bytes,
                    f.getContentType() != null ? f.getContentType() : "application/pdf");
            uploadedKeys.add(key);
        }

        // ── Persist: primary key (index 0) + full array ───────────────────────
        note.setPrescriptionS3Key(uploadedKeys.get(0));
        note.setPrescriptionS3Keys(uploadedKeys);
        soapNoteRepository.save(note);

        jdbc.update("""
            INSERT INTO prescription_audit_log (soap_note_id, actor_id, action, metadata, created_at)
            VALUES (?, NULL, 'UPLOADED', ?::jsonb, NOW())
            """,
            note.getId(),
            "{\"fileCount\":" + uploadedKeys.size() + "}");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("primaryKey", uploadedKeys.get(0));
        body.put("s3Keys",     uploadedKeys);
        body.put("fileCount",  uploadedKeys.size());
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    // -------------------------------------------------------------------------
    // List presigned URLs for all files on a prescription (multi-file support)
    // -------------------------------------------------------------------------

    @GetMapping("/api/v1/appointments/{appointmentId}/prescription/files")
    @PreAuthorize("hasAnyRole('DOCTOR','SPONSOR','PHARMACIST')")
    public ResponseEntity<Map<String, Object>> listPrescriptionFiles(@PathVariable Long appointmentId) {
        SoapNote note = soapNoteRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No SOAP note for appointment " + appointmentId));

        List<String> keys = note.getPrescriptionS3Keys();
        if (keys == null || keys.isEmpty()) {
            // Fall back to single-key for pre-V14 rows
            String singleKey = note.getPrescriptionS3Key();
            if (singleKey == null || singleKey.isBlank())
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No prescription files uploaded yet.");
            keys = List.of(singleKey);
        }

        List<Map<String, String>> files = new ArrayList<>();
        for (int i = 0; i < keys.size(); i++) {
            Map<String, String> entry = new LinkedHashMap<>();
            entry.put("index", String.valueOf(i));
            entry.put("s3Key", keys.get(i));
            entry.put("url",   s3Service.generatePresignedUrl(keys.get(i)));
            files.add(entry);
        }

        jdbc.update("""
            INSERT INTO prescription_audit_log (soap_note_id, actor_id, action, created_at)
            VALUES (?, NULL, 'VIEWED', NOW())
            """, note.getId());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fileCount", files.size());
        body.put("files",     files);
        return ResponseEntity.ok(body);
    }

    // -------------------------------------------------------------------------
    // Pre-signed view URL (DOCTOR | SPONSOR | PHARMACIST)
    // -------------------------------------------------------------------------

    @GetMapping("/api/v1/appointments/{appointmentId}/prescription/view")
    @PreAuthorize("hasAnyRole('DOCTOR','SPONSOR','PHARMACIST')")
    public ResponseEntity<Map<String, String>> viewPrescription(@PathVariable Long appointmentId) {
        SoapNote note = soapNoteRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No SOAP note for appointment " + appointmentId));

        String s3Key = note.getPrescriptionS3Key();
        if (s3Key == null || s3Key.isBlank())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No prescription uploaded yet.");

        jdbc.update("""
            INSERT INTO prescription_audit_log (soap_note_id, actor_id, action, created_at)
            VALUES (?, NULL, 'VIEWED', NOW())
            """, note.getId());

        return ResponseEntity.ok(Map.of("url", s3Service.generatePresignedUrl(s3Key)));
    }

    // -------------------------------------------------------------------------
    // Pharmacist queue — PENDING_VERIFICATION, sorted by upload time ASC
    // -------------------------------------------------------------------------

    @GetMapping("/api/v1/prescriptions/queue")
    @PreAuthorize("hasRole('PHARMACIST')")
    public ResponseEntity<List<Map<String, Object>>> getPrescriptionQueue() {
        List<Map<String, Object>> queue = jdbc.queryForList("""
            SELECT
                sn.id                          AS soap_note_id,
                u_patient.name                 AS patient_name,
                u_doctor.name                  AS doctor_name,
                a.start_time                   AS appointment_date,
                m.days_remaining               AS days_remaining,
                sn.prescription_status         AS prescription_status,
                sn.prescription_uploaded_at    AS prescription_uploaded_at,
                sn.prescription_s3_key         AS s3_key
            FROM soap_notes sn
            JOIN users u_patient ON u_patient.id = sn.patient_id
            JOIN users u_doctor  ON u_doctor.id  = sn.doctor_id
            LEFT JOIN appointments a ON a.id = sn.appointment_id
            LEFT JOIN LATERAL (
                SELECT (total_quantity / NULLIF(daily_dosage, 0)) AS days_remaining
                FROM medications
                WHERE patient_id = sn.patient_id
                ORDER BY days_remaining ASC LIMIT 1
            ) m ON true
            WHERE sn.prescription_status IN ('PENDING_VERIFICATION','AWAITING_CLARIFICATION')
              AND sn.prescription_s3_key IS NOT NULL
            ORDER BY sn.prescription_uploaded_at ASC
            """);
        return ResponseEntity.ok(queue);
    }

    // -------------------------------------------------------------------------
    // Approve
    // -------------------------------------------------------------------------

    @PostMapping("/api/v1/prescriptions/{id}/approve")
    @PreAuthorize("hasRole('PHARMACIST')")
    public ResponseEntity<Void> approve(@PathVariable Long id,
                                        @RequestBody Map<String, Object> body) {
        updateStatus(id, "APPROVED", body, "APPROVED", null);
        return ResponseEntity.ok().build();
    }

    // -------------------------------------------------------------------------
    // Reject
    // -------------------------------------------------------------------------

    @PostMapping("/api/v1/prescriptions/{id}/reject")
    @PreAuthorize("hasRole('PHARMACIST')")
    public ResponseEntity<Void> reject(@PathVariable Long id,
                                       @RequestBody Map<String, Object> body) {
        String reason = (String) body.get("reason");
        if (reason == null || reason.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rejection reason is required.");
        updateStatus(id, "REJECTED", body, "REJECTED", reason);
        return ResponseEntity.ok().build();
    }

    // -------------------------------------------------------------------------
    // Request clarification
    // -------------------------------------------------------------------------

    @PostMapping("/api/v1/prescriptions/{id}/clarify")
    @PreAuthorize("hasRole('PHARMACIST')")
    public ResponseEntity<Void> clarify(@PathVariable Long id,
                                        @RequestBody Map<String, Object> body) {
        updateStatus(id, "AWAITING_CLARIFICATION", body, "CLARIFICATION_REQUESTED", null);
        return ResponseEntity.ok().build();
    }

    // -------------------------------------------------------------------------
    // Dispatch (CONSULT-002) — pharmacist marks prescription as dispatched
    // -------------------------------------------------------------------------

    /**
     * CONSULT-002: Pharmacist marks a prescription as DISPATCHED.
     * Sends a chat notification to the patient confirming dispatch.
     *
     * Body: { "pharmacistId": 42, "pharmacyName": "Preventia Pharmacy", "notes": "optional" }
     */
    @PostMapping("/api/v1/prescriptions/{id}/dispatch")
    @PreAuthorize("hasRole('PHARMACIST')")
    public ResponseEntity<Void> dispatch(@PathVariable Long id,
                                         @RequestBody Map<String, Object> body) {
        updateStatus(id, "DISPATCHED", body, "DISPATCHED", null);

        // CONSULT-002: Notify patient via Stream Chat (best-effort)
        try {
            soapNoteRepository.findById(id).ifPresent(note -> {
                String pharmacyName = (String) body.getOrDefault("pharmacyName", "Preventia Pharmacy");
                String notes = (String) body.get("notes");
                String medicationSummary = notes != null && !notes.isBlank()
                    ? notes
                    : "your prescription";
                chatNotificationService.sendPrescriptionDispatchedToPatient(
                    note.getDoctorId(),
                    note.getPatientId(),
                    medicationSummary,
                    pharmacyName
                );
            });
        } catch (Exception e) {
            log.warn("[PrescriptionController] Failed to send dispatch notification for soapNote={}: {}",
                id, e.getMessage());
        }

        return ResponseEntity.ok().build();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void updateStatus(Long soapNoteId, String newStatus,
                              Map<String, Object> body, String action, String reason) {
        int updated = jdbc.update(
                "UPDATE soap_notes SET prescription_status = ?::prescription_status, updated_at = NOW() WHERE id = ?",
                newStatus, soapNoteId);
        if (updated == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Prescription not found: " + soapNoteId);

        Object actorId = body.get("pharmacistId");
        jdbc.update("""
            INSERT INTO prescription_audit_log (soap_note_id, actor_id, action, reason, created_at)
            VALUES (?, ?, ?::prescription_action, ?, NOW())
            """, soapNoteId, actorId, action, reason);
    }
}
