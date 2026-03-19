package com.preventia.appointment.domain;

/**
 * Lifecycle states for a Preventia teleconsultation appointment.
 *
 * State machine:
 *   SCHEDULED → ACTIVE → COMPLETED
 *                       → LOCKED
 *
 * EMR write-access (SOAP notes) is permitted ONLY in the ACTIVE state.
 */
public enum AppointmentStatus {
    SCHEDULED,   // Booked, not yet started
    ACTIVE,      // Daily.co room is live, EMR write-access open
    COMPLETED,   // Session ended normally
    LOCKED       // EMR write-access revoked, session archived
}
