package com.preventia.appointment.dto;

import com.preventia.appointment.domain.AppointmentStatus;

public record UpdateAppointmentStatusRequest(
        AppointmentStatus status
) {}
