package com.preventia.enrollment.controller;

import com.preventia.auth.repository.UserRepository;
import com.preventia.enrollment.dto.EnrollmentRequest;
import com.preventia.enrollment.dto.EnrollmentResponse;
import com.preventia.enrollment.service.EnrollmentService;
import com.preventia.family.domain.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Enrollment endpoints for wellness program sign-up.
 *
 * POST /api/v1/enroll
 *   Initiates a wellness program enrollment for the authenticated RECIPIENT.
 *   Returns a calculated total and a stub payment order reference.
 *   Full Razorpay/Stripe gateway wiring is tracked in EnrollmentService TODO block.
 *
 * GET /api/v1/enroll/{id}
 *   Polls the status of an enrollment record.
 *   STUB — returns 501 until DB persistence is implemented (V16).
 */
@RestController
@RequestMapping("/api/v1/enroll")
public class EnrollmentController {

    private final EnrollmentService enrollmentService;
    private final UserRepository    userRepository;

    public EnrollmentController(EnrollmentService enrollmentService,
                                UserRepository userRepository) {
        this.enrollmentService = enrollmentService;
        this.userRepository    = userRepository;
    }

    /**
     * POST /api/v1/enroll
     *
     * Initiates a wellness program enrollment.
     * Calculates total, validates program + add-on IDs, returns PENDING_PAYMENT response.
     * Payment gateway order creation is stubbed — paymentOrderId will be null until wired.
     *
     * Request body:
     * {
     *   "programId":    "BASIC_WELLNESS" | "FIT2FLY_360",
     *   "memberIds":    [1, 2],          // family_members.id list
     *   "addOns":       ["VIRTUAL_CONSULT", "SAHAYAK"],  // optional
     *   "currency":     "INR",           // default INR
     *   "paymentMethod":"RAZORPAY"       // RAZORPAY | STRIPE
     * }
     *
     * Response: EnrollmentResponse { status, totalAmountPaise, currency, paymentOrderId, … }
     */
    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("hasRole('RECIPIENT')")
    public EnrollmentResponse initiateEnrollment(@Valid @RequestBody EnrollmentRequest request,
                                                 Authentication auth) {
        User owner = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Authenticated user not found: " + auth.getName()));

        return enrollmentService.initiateEnrollment(owner.getId(), request);
    }

    /**
     * GET /api/v1/enroll/{id}
     *
     * Returns the status of an enrollment record.
     * STUB — 501 Not Implemented until V16 DB persistence is in place.
     *
     * TODO: implement once enrollments table exists (V16).
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('RECIPIENT')")
    public EnrollmentResponse getEnrollment(@PathVariable Long id) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED,
            "Enrollment status polling not yet implemented. Pending V16 DB schema and persistence layer.");
    }
}
