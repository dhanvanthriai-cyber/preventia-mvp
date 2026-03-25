package com.preventia.appointment.dto;

import com.preventia.appointment.domain.AppointmentStatus;

import java.time.OffsetDateTime;

/**
 * Outbound DTO returned to API callers after appointment operations.
 * Derived from the {@link com.preventia.appointment.domain.Appointment} entity.
 *
 * Token fields (doctorToken, recipientToken, sponsorToken) are populated
 * ONLY on creation (POST /api/v1/appointments). They are null on all
 * subsequent responses. Callers must store tokens immediately — they
 * cannot be retrieved again from this API.
 *
 * sponsorToken is null when no NRI sponsor is linked to the appointment.
 */
public record AppointmentResponse(
        Long id,
        Long recipientId,
        Long sponsorId,
        Long doctorId,
        OffsetDateTime startTime,
        OffsetDateTime endTime,
        String dailyRoomUrl,
        String dailyRoomName,
        AppointmentStatus status,
        OffsetDateTime createdAt,

        // Denormalized name snapshots (populated at booking time; null for pre-V22 rows until backfill)
        String doctorName,
        String recipientName,

        // Populated on creation only — null for state-transition responses
        String doctorToken,
        String recipientToken,
        String sponsorToken     // null when no NRI sponsor on this appointment
) {}
