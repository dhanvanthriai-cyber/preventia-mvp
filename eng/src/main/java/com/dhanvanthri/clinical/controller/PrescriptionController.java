package com.dhanvanthri.clinical.controller;

import com.dhanvanthri.clinical.domain.SoapNote;
import com.dhanvanthri.clinical.repository.SoapNoteRepository;
import com.dhanvanthri.shared.service.S3Service;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;

/**
 * Manages prescription PDF upload and secure access for Project Dhanvanthri.
 *
 * Upload flow (DOCTOR):
 *   POST /api/v1/appointments/{appointmentId}/prescription
 *   → Stores PDF in S3 at prescriptions/{appointmentId}/{filename}
 *   → Persists the S3 key on the matching SoapNote
 *
 * View flow (DOCTOR / SPONSOR / PHARMACIST):
 *   GET /api/v1/appointments/{appointmentId}/prescription/view
 *   → Returns a 15-minute pre-signed HTTPS URL — no S3 credentials exposed to clients
 *
 * Note: appointmentId maps 1:1 to SoapNote.id in the current MVP schema.
 * If a dedicated appointment_id FK is added to soap_notes in a future migration,
 * update the repository lookup accordingly.
 */
@RestController
@RequestMapping("/api/v1/appointments/{appointmentId}/prescription")
public class PrescriptionController {

    private final S3Service s3Service;
    private final SoapNoteRepository soapNoteRepository;

    public PrescriptionController(S3Service s3Service, SoapNoteRepository soapNoteRepository) {
        this.s3Service          = s3Service;
        this.soapNoteRepository = soapNoteRepository;
    }

    // -------------------------------------------------------------------------
    // Upload
    // -------------------------------------------------------------------------

    /**
     * Uploads a prescription PDF for the given appointment.
     *
     * <p>Only a DOCTOR may upload. The file is stored at
     * {@code prescriptions/{appointmentId}/{originalFilename}} in S3, and the resulting
     * S3 key is persisted on the corresponding {@link SoapNote}.
     *
     * @param appointmentId  the appointment (and SoapNote) ID
     * @param file           multipart PDF file from the request body (field name: {@code file})
     * @return JSON body with {@code s3Key} field, HTTP 201
     */
    @PostMapping(consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<Map<String, String>> uploadPrescription(
            @PathVariable Long appointmentId,
            @RequestParam("file") MultipartFile file) {

        SoapNote note = soapNoteRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No SOAP note found for appointment " + appointmentId));

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Failed to read uploaded file: " + e.getMessage());
        }

        String keyPrefix    = "prescriptions/" + appointmentId;
        String filename     = file.getOriginalFilename() != null
                ? file.getOriginalFilename()
                : "prescription.pdf";
        String contentType  = file.getContentType() != null
                ? file.getContentType()
                : "application/pdf";

        String s3Key = s3Service.uploadFile(keyPrefix, filename, bytes, contentType);

        note.setPrescriptionS3Key(s3Key);
        soapNoteRepository.save(note);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of("s3Key", s3Key));
    }

    // -------------------------------------------------------------------------
    // View (pre-signed URL)
    // -------------------------------------------------------------------------

    /**
     * Returns a 15-minute pre-signed URL for the prescription PDF.
     *
     * <p>Accessible by DOCTOR, SPONSOR (NRI Bridge), and PHARMACIST.
     * The URL expires after 15 minutes — suitable for in-session viewing,
     * short enough to prevent persistent link-sharing.
     *
     * @param appointmentId the appointment (and SoapNote) ID
     * @return JSON body with {@code url} field (HTTPS pre-signed S3 URL), HTTP 200
     */
    @GetMapping("/view")
    @PreAuthorize("hasAnyRole('DOCTOR','SPONSOR','PHARMACIST')")
    public ResponseEntity<Map<String, String>> viewPrescription(
            @PathVariable Long appointmentId) {

        SoapNote note = soapNoteRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No SOAP note found for appointment " + appointmentId));

        String s3Key = note.getPrescriptionS3Key();
        if (s3Key == null || s3Key.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No prescription uploaded for appointment " + appointmentId);
        }

        String presignedUrl = s3Service.generatePresignedUrl(s3Key);

        return ResponseEntity.ok(Map.of("url", presignedUrl));
    }
}
