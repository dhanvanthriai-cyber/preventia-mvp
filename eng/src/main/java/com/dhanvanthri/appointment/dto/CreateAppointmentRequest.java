package com.dhanvanthri.appointment.dto;

import java.time.OffsetDateTime;

/**
 * Inbound request payload for scheduling a new appointment.
 *
 * sponsorId is optional — present when an NRI child sponsors / observes the session.
 */
public record CreateAppointmentRequest(
        Long recipientId,
        Long sponsorId,        // nullable
        Long doctorId,
        OffsetDateTime startTime,
        OffsetDateTime endTime,
        String dailyRoomUrl,
        String dailyRoomName
) {}
