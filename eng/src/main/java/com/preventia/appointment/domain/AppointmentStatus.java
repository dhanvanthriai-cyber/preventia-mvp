package com.preventia.appointment.domain;

/**
 * Lifecycle states for a Preventia teleconsultation appointment.
 *
 * State machine:
 *   SCHEDULED → ACTIVE → COMPLETED
 *             → CANCELLED
 *                       → LOCKED
 *
 * EMR write-access (SOAP notes) is permitted ONLY in the ACTIVE state.
 */
public enum AppointmentStatus {
    SCHEDULED,   // Booked, not yet started
    ACTIVE,      // Daily.co room is live, EMR write-access open
    CANCELLED,   // Declined or cancelled before the consultation happens
    COMPLETED,   // Session ended normally
    LOCKED       // EMR write-access revoked, session archived
}
