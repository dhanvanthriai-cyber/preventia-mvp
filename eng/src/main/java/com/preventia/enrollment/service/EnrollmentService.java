package com.preventia.enrollment.service;

import com.preventia.enrollment.dto.EnrollmentRequest;
import com.preventia.enrollment.dto.EnrollmentResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * EnrollmentService — wellness program enrollment logic.
 *
 * ─── STUB STATUS ──────────────────────────────────────────────────────────────
 * This service is a functional stub. It validates the request and returns a
 * deterministic response that the frontend can work against immediately.
 *
 * TODO (requires product confirmation before implementing):
 *  1. DB schema — create `enrollments` + `enrollment_members` tables (V16)
 *  2. Persist enrollment record and member associations
 *  3. Wire Razorpay order creation (CreatePaymentRequest → PaymentService)
 *  4. Wire Stripe PaymentIntent creation for non-INR currencies
 *  5. Add scheduler: check enrollment payment status after 30 min → cancel unpaid
 *  6. Emit audit event on enrollment creation / payment confirmation
 *  7. Add GET /api/v1/enroll/{id} for enrollment status polling by the frontend
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Service
public class EnrollmentService {

    private static final Logger log = LoggerFactory.getLogger(EnrollmentService.class);

    // ── Wellness program catalogue (stub — move to DB or config in V16) ──────

    private static final Map<String, Long> PROGRAM_PRICES_PAISE = Map.of(
        "BASIC_WELLNESS",  150_000L,   // ₹1,500/mo × 100 paise
        "FIT2FLY_360",     499_900L    // ₹4,999/mo × 100 paise
    );

    private static final Map<String, Long> ADDON_PRICES_PAISE = Map.of(
        "VIRTUAL_CONSULT", 99_900L,    // ₹999/visit
        "SAHAYAK",         99_900L     // ₹999/day
    );

    /**
     * Calculates the enrollment total and returns a stub response with
     * PENDING_PAYMENT status. No DB write or gateway call is made yet.
     *
     * @param ownerUserId  ID of the authenticated RECIPIENT initiating enrollment
     * @param request      validated enrollment request from controller
     * @return             EnrollmentResponse with totalAmountPaise and stub paymentOrderId
     */
    public EnrollmentResponse initiateEnrollment(Long ownerUserId, EnrollmentRequest request) {
        String programId = request.programId();

        if (!PROGRAM_PRICES_PAISE.containsKey(programId)) {
            throw new IllegalArgumentException(
                "Unknown program: " + programId +
                ". Valid values: " + PROGRAM_PRICES_PAISE.keySet());
        }

        long baseAmount = PROGRAM_PRICES_PAISE.get(programId);
        long addOnTotal = 0L;
        List<String> validAddOns = List.of();

        if (request.addOns() != null && !request.addOns().isEmpty()) {
            validAddOns = request.addOns().stream()
                .filter(ADDON_PRICES_PAISE::containsKey)
                .toList();
            addOnTotal = validAddOns.stream()
                .mapToLong(id -> ADDON_PRICES_PAISE.getOrDefault(id, 0L))
                .sum();
        }

        long total      = baseAmount + addOnTotal;
        String currency = (request.currency() != null && !request.currency().isBlank())
            ? request.currency().toUpperCase()
            : "INR";
        String gateway  = "STRIPE".equalsIgnoreCase(request.paymentMethod()) ? "STRIPE" : "RAZORPAY";

        log.info("[EnrollmentService] STUB — owner={} program={} members={} addOns={} total={}paise currency={} gateway={}",
            ownerUserId, programId, request.memberIds(), validAddOns, total, currency, gateway);

        // ── STUB: return PENDING_PAYMENT without writing to DB or calling gateway ──
        return new EnrollmentResponse(
            "PENDING_PAYMENT",
            null,               // enrollmentId — null until persisted (TODO V16)
            programId,
            request.memberIds(),
            validAddOns,
            total,
            currency,
            null,               // paymentOrderId — null until gateway is wired (TODO)
            gateway,
            "Enrollment calculated. Payment gateway integration pending — connect Razorpay/Stripe order creation to proceed."
        );
    }
}
