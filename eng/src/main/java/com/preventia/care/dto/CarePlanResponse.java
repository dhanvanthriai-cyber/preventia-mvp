package com.preventia.care.dto;

import com.preventia.care.domain.CarePlan;
import java.time.Instant;

public record CarePlanResponse(
    Long    id,
    Long    patientId,
    Long    doctorId,
    Long    appointmentId,
    String  question,
    String  frequency,
    Instant nextSendAt,
    boolean active,
    int     missedCount,
    Instant createdAt
) {
    public static CarePlanResponse from(CarePlan cp) {
        return new CarePlanResponse(
            cp.getId(), cp.getPatientId(), cp.getDoctorId(),
            cp.getAppointmentId(), cp.getQuestion(), cp.getFrequency(),
            cp.getNextSendAt(), cp.isActive(), cp.getMissedCount(), cp.getCreatedAt()
        );
    }
}
