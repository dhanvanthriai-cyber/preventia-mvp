package com.dhanvanthri.appointment.dto;

import com.dhanvanthri.appointment.domain.AppointmentStatus;

import java.time.OffsetDateTime;

/**
 * Outbound DTO returned to API callers after appointment operations.
 * Derived from the {@link com.dhanvanthri.appointment.domain.Appointment} entity.
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
        OffsetDateTime createdAt
) {}
