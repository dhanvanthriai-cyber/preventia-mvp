package com.preventia.lab.domain;

/**
 * Supported diagnostic lab partners for Project Preventia.
 * MVP integration: THYROCARE (REST API).
 * Others are onboarding-ready stubs.
 */
public enum LabPartnerCode {
    THYROCARE,
    DR_LAL,
    METROPOLIS,
    SRL,
    MANUAL   // Fallback: ops team manually uploads result PDF
}
