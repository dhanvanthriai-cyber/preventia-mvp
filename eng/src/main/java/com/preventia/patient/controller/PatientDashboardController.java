package com.preventia.patient.controller;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.domain.AppointmentStatus;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.auth.repository.UserRepository;
import com.preventia.clinical.domain.SoapNote;
import com.preventia.clinical.dto.SoapNoteResponse;
import com.preventia.clinical.repository.SoapNoteRepository;
import com.preventia.family.domain.User;
import com.preventia.lab.domain.LabOrder;
import com.preventia.lab.repository.LabOrderRepository;
import com.preventia.payment.dto.PaymentResponse;
import com.preventia.payment.repository.PaymentRepository;
import com.preventia.pharmacy.dto.MedicationResponse;
import com.preventia.pharmacy.repository.MedicationRepository;
import com.preventia.shared.service.S3Service;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Read-only dashboard endpoints for the authenticated patient (RECIPIENT role).
 *
 * All four endpoints derive the patient's internal ID from the JWT principal
 * via UserRepository.findByEmail(auth.getName()), so the caller never passes
 * a patientId in the URL — eliminating IDOR risk.
 *
 * Security: all methods are guarded by {@code @PreAuthorize("hasRole('RECIPIENT')")}.
 */
@RestController
@RequestMapping("/api/v1/patients/me")
@PreAuthorize("hasRole('RECIPIENT')")
public class PatientDashboardController {

    private final UserRepository userRepository;
    private final SoapNoteRepository soapNoteRepository;
    private final MedicationRepository medicationRepository;
    private final PaymentRepository paymentRepository;
    private final S3Service s3Service;
    private final AppointmentRepository appointmentRepository;
    private final LabOrderRepository labOrderRepository;

    public PatientDashboardController(
            UserRepository userRepository,
            SoapNoteRepository soapNoteRepository,
            MedicationRepository medicationRepository,
            PaymentRepository paymentRepository,
            S3Service s3Service,
            AppointmentRepository appointmentRepository,
            LabOrderRepository labOrderRepository) {
        this.userRepository = userRepository;
        this.soapNoteRepository = soapNoteRepository;
        this.medicationRepository = medicationRepository;
        this.paymentRepository = paymentRepository;
        this.s3Service = s3Service;
        this.appointmentRepository = appointmentRepository;
        this.labOrderRepository = labOrderRepository;
    }

    // ── A. SOAP Notes (vitals + clinical history) ─────────────────────────────

    /**
     * Returns all SOAP notes for the authenticated patient, most recent first.
     * Frontend uses {@code objective} for vitals parsing and {@code assessment}
     * for clinical history.
     *
     * GET /api/v1/patients/me/soap-notes
     */
    @GetMapping("/soap-notes")
    public ResponseEntity<List<SoapNoteResponse>> getSoapNotes(Authentication auth) {
        Long patientId = resolvePatientId(auth);
        List<SoapNoteResponse> notes = soapNoteRepository
                .findByPatientIdOrderByCreatedAtDesc(patientId)
                .stream()
                .map(SoapNoteResponse::from)
                .toList();
        return ResponseEntity.ok(notes);
    }

    // ── B. Medications ────────────────────────────────────────────────────────

    /**
     * Returns all medication records for the authenticated patient.
     * The MedicationResponse DTO includes computed daysRemaining + refill intelligence.
     *
     * GET /api/v1/patients/me/medications
     */
    @GetMapping("/medications")
    public ResponseEntity<List<MedicationResponse>> getMedications(Authentication auth) {
        Long patientId = resolvePatientId(auth);
        List<MedicationResponse> meds = medicationRepository
                .findByPatientId(patientId)
                .stream()
                .map(MedicationResponse::from)
                .toList();
        return ResponseEntity.ok(meds);
    }

    // ── C. Payments ───────────────────────────────────────────────────────────

    /**
     * Returns all payment records where payer_id = patient's userId, most recent first.
     * clientSecret is omitted from the response (null) — this is a read-only view.
     *
     * GET /api/v1/patients/me/payments
     */
    @GetMapping("/payments")
    public ResponseEntity<List<PaymentResponse>> getPayments(Authentication auth) {
        Long patientId = resolvePatientId(auth);
        List<PaymentResponse> pays = paymentRepository
                .findByPayerIdOrderByCreatedAtDesc(patientId)
                .stream()
                .map(PaymentResponse::from)
                .toList();
        return ResponseEntity.ok(pays);
    }

    // ── D. Prescription Records (vaulted files) ───────────────────────────────

    /**
     * For each SOAP note that has uploaded prescription PDFs, generates presigned
     * S3 URLs and returns a structured list with appointmentId and file metadata.
     *
     * Each entry:
     * <pre>
     * {
     *   "appointmentId": 42,
     *   "files": [
     *     { "index": 0, "filename": "prescription.pdf", "url": "https://..." }
     *   ]
     * }
     * </pre>
     *
     * Notes without any prescription keys are silently skipped.
     *
     * GET /api/v1/patients/me/prescription-records
     */
    @GetMapping("/prescription-records")
    public ResponseEntity<List<Map<String, Object>>> getPrescriptionRecords(Authentication auth) {
        Long patientId = resolvePatientId(auth);

        List<SoapNote> notes = soapNoteRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (SoapNote note : notes) {
            List<String> keys = note.getPrescriptionS3Keys();
            if (keys == null || keys.isEmpty()) {
                // Fall back to singular key for backward compatibility
                String singleKey = note.getPrescriptionS3Key();
                if (singleKey == null || singleKey.isBlank()) {
                    continue;
                }
                keys = List.of(singleKey);
            }

            List<Map<String, Object>> files = new ArrayList<>();
            for (int i = 0; i < keys.size(); i++) {
                String key = keys.get(i);
                if (key == null || key.isBlank()) continue;

                // Extract filename from last segment of the S3 key
                String filename = key.contains("/") ? key.substring(key.lastIndexOf('/') + 1) : key;
                String url = s3Service.generatePresignedUrl(key);

                Map<String, Object> fileEntry = new HashMap<>();
                fileEntry.put("index", i);
                fileEntry.put("filename", filename);
                fileEntry.put("url", url);
                files.add(fileEntry);
            }

            if (files.isEmpty()) continue;

            Map<String, Object> record = new HashMap<>();
            record.put("appointmentId", note.getAppointmentId());
            record.put("files", files);
            result.add(record);
        }

        return ResponseEntity.ok(result);
    }

    // ── E. Consultation History ───────────────────────────────────────────────

    /**
     * Returns all completed/locked appointments for the patient, joined with their
     * SOAP notes (if present). Most recent first.
     *
     * GET /api/v1/patients/me/consultation-history
     */
    @GetMapping("/consultation-history")
    public ResponseEntity<List<Map<String, Object>>> getConsultationHistory(Authentication auth) {
        Long patientId = resolvePatientId(auth);

        List<Appointment> completed = appointmentRepository.findByRecipientId(patientId)
                .stream()
                .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED
                          || a.getStatus() == AppointmentStatus.LOCKED)
                .sorted(Comparator.comparing(Appointment::getStartTime).reversed())
                .toList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (Appointment appt : completed) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("appointmentId", appt.getId());
            entry.put("doctorId", appt.getDoctorId());
            entry.put("doctorName", appt.getDoctorName());
            entry.put("recipientName", appt.getRecipientName());
            entry.put("startTime", appt.getStartTime());
            entry.put("endTime", appt.getEndTime());
            entry.put("status", appt.getStatus());

            // Attach SOAP note if present (targeted lookup by appointmentId — avoids N+1)
            soapNoteRepository.findByAppointmentId(appt.getId())
                    .stream().findFirst()
                    .ifPresent(note -> {
                        entry.put("subjective", note.getSubjective());
                        entry.put("objective", note.getObjective());
                        entry.put("assessment", note.getAssessment());
                        entry.put("plan", note.getPlan());
                        entry.put("prescriptionS3Key", note.getPrescriptionS3Key());

                        List<String> keys = note.getPrescriptionS3Keys();
                        if (keys != null && !keys.isEmpty()) {
                            List<Map<String, Object>> files = new ArrayList<>();
                            for (String k : keys) {
                                if (k == null || k.isBlank()) continue;
                                String filename = k.contains("/")
                                        ? k.substring(k.lastIndexOf('/') + 1)
                                        : k;
                                Map<String, Object> fileEntry = new HashMap<>();
                                fileEntry.put("filename", filename);
                                fileEntry.put("url", s3Service.generatePresignedUrl(k));
                                files.add(fileEntry);
                            }
                            entry.put("prescriptionFiles", files);
                        }
                    });

            result.add(entry);
        }
        return ResponseEntity.ok(result);
    }

    // ── F. Lab Orders (vault) ─────────────────────────────────────────────────

    /**
     * Returns all lab orders for the patient, most recent first.
     * For orders with a result PDF, generates a presigned S3 URL.
     *
     * GET /api/v1/patients/me/lab-orders
     */
    @GetMapping("/lab-orders")
    public ResponseEntity<List<Map<String, Object>>> getLabOrders(Authentication auth) {
        Long patientId = resolvePatientId(auth);

        List<LabOrder> orders = labOrderRepository.findByPatientIdOrderByCreatedAtDesc(patientId);

        List<Map<String, Object>> result = new ArrayList<>();
        for (LabOrder order : orders) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", order.getId());
            entry.put("testName", order.getTestName());
            entry.put("labPartner", order.getLabPartner() != null
                    ? order.getLabPartner().name() : null);
            entry.put("status", order.getStatus());
            entry.put("createdAt", order.getCreatedAt());

            String pdfKey = order.getResultPdfKey();
            if (pdfKey != null && !pdfKey.isBlank()) {
                entry.put("resultUrl", s3Service.generatePresignedUrl(pdfKey));
            } else {
                entry.put("resultUrl", null);
            }
            result.add(entry);
        }
        return ResponseEntity.ok(result);
    }

    // ── G. Vitals History (devices) ───────────────────────────────────────────

    /**
     * Returns the last 10 SOAP notes for the patient with their objective text
     * (vitals) and timestamps. Used by the Devices page vitals history table.
     *
     * GET /api/v1/patients/me/vitals-history
     */
    @GetMapping("/vitals-history")
    public ResponseEntity<List<Map<String, Object>>> getVitalsHistory(Authentication auth) {
        Long patientId = resolvePatientId(auth);

        List<SoapNote> notes = soapNoteRepository
                .findByPatientIdOrderByCreatedAtDesc(patientId)
                .stream()
                .limit(10)
                .toList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (SoapNote note : notes) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("appointmentId", note.getAppointmentId());
            entry.put("createdAt", note.getCreatedAt());
            entry.put("objective", note.getObjective());
            result.add(entry);
        }
        return ResponseEntity.ok(result);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    /**
     * Resolves the authenticated user's internal DB id from their JWT email claim.
     *
     * @throws jakarta.persistence.EntityNotFoundException if the user cannot be found
     *         (should not happen for a valid JWT, but guards against data inconsistency)
     */
    private Long resolvePatientId(Authentication auth) {
        String email = auth.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                        "Authenticated user not found in database: " + email));
        return user.getId();
    }
}
