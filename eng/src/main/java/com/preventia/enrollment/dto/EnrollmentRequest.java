package com.preventia.enrollment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Request body for POST /api/v1/enroll.
 *
 * programId    — wellness program identifier (e.g. "BASIC_WELLNESS", "FIT2FLY_360")
 * memberIds    — family_members.id list to enroll into the program
 * addOns       — optional add-on service slugs (e.g. "VIRTUAL_CONSULT", "SAHAYAK")
 * currency     — ISO 4217 currency code; defaults to "INR"
 * paymentMethod— "RAZORPAY" | "STRIPE" — determines which payment gateway is used
 */
public record EnrollmentRequest(
    @NotBlank String       programId,
    @NotEmpty List<Long>   memberIds,
    List<String>           addOns,
    String                 currency,
    String                 paymentMethod
) {}
