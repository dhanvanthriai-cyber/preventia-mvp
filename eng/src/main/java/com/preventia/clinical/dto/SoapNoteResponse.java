package com.preventia.clinical.dto;

import com.preventia.clinical.domain.SoapNote;

import java.time.Instant;
import java.util.List;

/**
 * Outbound DTO returned after a SOAP note is successfully created or fetched.
 */
public record SoapNoteResponse(
        Long id,
        Long appointmentId,
        Long patientId,
        Long doctorId,
        String subjective,
        String objective,
        String assessment,
        String plan,
        String sessionToken,
        String prescriptionS3Key,
        List<String> prescriptionS3Keys,
        Instant createdAt
) {
    /** Factory method — maps entity to response record. */
    public static SoapNoteResponse from(SoapNote note) {
        return new SoapNoteResponse(
                note.getId(),
                note.getAppointmentId(),
                note.getPatientId(),
                note.getDoctorId(),
                note.getSubjective(),
                note.getObjective(),
                note.getAssessment(),
                note.getPlan(),
                note.getSessionToken(),
                note.getPrescriptionS3Key(),
                note.getPrescriptionS3Keys(),
                note.getCreatedAt()
        );
    }
}
