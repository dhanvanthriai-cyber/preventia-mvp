package com.preventia.consent.controller;

import com.preventia.auth.repository.UserRepository;
import com.preventia.consent.dto.ConsentCheckResponse;
import com.preventia.consent.dto.ConsentRequest;
import com.preventia.consent.service.ConsentService;
import com.preventia.family.domain.User;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

/**
 * ConsentController — manages pre-consultation consent gate.
 *
 * GET  /api/v1/consent/check?appointmentId={id}  → { required: true/false }
 * POST /api/v1/consent                            → 201 Created
 */
@RestController
@RequestMapping("/api/v1/consent")
public class ConsentController {

    private final ConsentService  consentService;
    private final UserRepository  userRepository;

    public ConsentController(ConsentService consentService, UserRepository userRepository) {
        this.consentService = consentService;
        this.userRepository = userRepository;
    }

    /**
     * GET /api/v1/consent/check?appointmentId={id}
     *
     * Returns whether the authenticated user still needs to consent for this
     * appointment before they can join the consultation.
     */
    @GetMapping("/check")
    public ResponseEntity<ConsentCheckResponse> checkConsent(
            @RequestParam Long appointmentId,
            Authentication authentication) {

        Long userId = resolveUserId(authentication);
        return ResponseEntity.ok(consentService.checkRequired(userId, appointmentId));
    }

    /**
     * POST /api/v1/consent
     *
     * Records the user's consent for a specific appointment.
     * Body: { appointmentId: Long, recordingConsent: boolean }
     * Response: 201 Created
     */
    @PostMapping
    public ResponseEntity<Void> recordConsent(
            @RequestBody ConsentRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {

        Long userId   = resolveUserId(authentication);
        String ip     = httpRequest.getRemoteAddr();
        consentService.recordConsent(userId, request, ip);
        return ResponseEntity.created(URI.create("/api/v1/consent")).build();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Long resolveUserId(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + email));
        return user.getId();
    }
}
