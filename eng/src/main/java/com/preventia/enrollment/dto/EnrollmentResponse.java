package com.preventia.enrollment.dto;

import java.util.List;

/**
 * Response from POST /api/v1/enroll.
 *
 * status           — "PENDING_PAYMENT" | "ENROLLED" | "FAILED"
 * enrollmentId     — internal reference for this enrollment record (stub: null until DB is added)
 * programId        — echo of the requested program
 * enrolledMemberIds— family member IDs successfully included
 * totalAmountPaise — amount in smallest currency unit (paise for INR, cents for USD)
 *                    used directly by Razorpay / Stripe order creation
 * paymentOrderId   — gateway order/intent ID to hand off to the client for payment
 *                    (stub: null until payment integration is wired)
 * gatewayName      — "RAZORPAY" | "STRIPE"
 * message          — human-readable status message
 */
public record EnrollmentResponse(
    String       status,
    Long         enrollmentId,
    String       programId,
    List<Long>   enrolledMemberIds,
    List<String> addOns,
    long         totalAmountPaise,
    String       currency,
    String       paymentOrderId,
    String       gatewayName,
    String       message
) {}
