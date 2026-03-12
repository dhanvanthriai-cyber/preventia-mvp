package com.dhanvanthri.appointment.dto;

/**
 * Carries the outcome of a single Daily.co room provisioning operation.
 * Created by DailyRoomService and consumed by AppointmentService.
 *
 * Tokens are short-lived JWTs issued by Daily.co — never stored in the DB.
 * sponsorToken is null when no sponsor is present on the appointment.
 */
public record DailyRoomProvisionResult(
        String roomUrl,
        String roomName,
        String doctorToken,
        String recipientToken,
        String sponsorToken   // null if no NRI sponsor
) {}
