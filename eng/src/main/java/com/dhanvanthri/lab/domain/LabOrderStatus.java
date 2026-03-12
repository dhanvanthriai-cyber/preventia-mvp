package com.dhanvanthri.lab.domain;

/**
 * Lifecycle states for a lab order.
 *
 * Transitions (happy path):
 *   ORDERED → COLLECTED (webhook: sample_collected)
 *             → IN_TRANSIT → RESULTED (webhook: results_ready)
 * Failure path:
 *   Any state → FAILED (cold chain breach or lab API error)
 */
public enum LabOrderStatus {
    /** Order placed with lab partner API. */
    ORDERED,

    /** Phlebotomist confirmed sample collection (via webhook). */
    COLLECTED,

    /** Sample in transit to lab — cold chain monitoring active. */
    IN_TRANSIT,

    /** Results available; PDF fetched and stored in S3. */
    RESULTED,

    /** Terminal failure state — ops intervention required. */
    FAILED
}
