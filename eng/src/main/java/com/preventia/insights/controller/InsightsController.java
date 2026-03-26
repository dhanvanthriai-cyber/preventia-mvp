package com.preventia.insights.controller;

import com.preventia.auth.repository.UserRepository;
import com.preventia.family.domain.User;
import com.preventia.insights.domain.LifestyleInsight;
import com.preventia.insights.dto.InsightRequest;
import com.preventia.insights.dto.InsightResponse;
import com.preventia.insights.service.InsightsBroadcastService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for Lifestyle Insights.
 *
 * Endpoints:
 *   POST /api/v1/insights              — DOCTOR: post + broadcast an insight
 *   GET  /api/v1/insights              — DOCTOR: own feed | RECIPIENT: feed from their doctors
 *   POST /api/v1/insights/{id}/react   — RECIPIENT or DOCTOR: toggle like reaction
 *
 * Sprint-11: Lifestyle Insights Broadcast
 */
@RestController
@RequestMapping("/api/v1/insights")
public class InsightsController {

    private final InsightsBroadcastService broadcastService;
    private final UserRepository           userRepository;

    public InsightsController(InsightsBroadcastService broadcastService,
                              UserRepository userRepository) {
        this.broadcastService = broadcastService;
        this.userRepository   = userRepository;
    }

    // -------------------------------------------------------------------------
    // POST /api/v1/insights — doctor publishes a new insight
    // -------------------------------------------------------------------------

    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<InsightResponse> postInsight(
            @Valid @RequestBody InsightRequest req,
            Authentication auth) {

        User doctor = resolveUser(auth);

        LifestyleInsight saved = broadcastService.publish(
            doctor.getId(),
            doctor.getName(),
            req.category(),
            req.title(),
            req.body()
        );

        return ResponseEntity.ok(InsightResponse.from(saved));
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/insights — feed (role-filtered)
    // -------------------------------------------------------------------------

    /**
     * DOCTOR: returns own posted insights (newest first).
     * RECIPIENT: returns insights from all doctors they've consulted (newest first).
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'RECIPIENT')")
    public ResponseEntity<List<InsightResponse>> getInsights(Authentication auth) {
        User user = resolveUser(auth);

        List<InsightResponse> insights;

        if (user.getRole() == User.Role.DOCTOR) {
            insights = broadcastService.getInsightsByDoctor(user.getId(), user.getId());
        } else {
            // RECIPIENT — show from all their doctors
            insights = broadcastService.getInsightsForPatient(user.getId());
        }

        return ResponseEntity.ok(insights);
    }

    // -------------------------------------------------------------------------
    // POST /api/v1/insights/{id}/react — toggle reaction
    // -------------------------------------------------------------------------

    @PostMapping("/{id}/react")
    @PreAuthorize("hasAnyRole('DOCTOR', 'RECIPIENT')")
    public ResponseEntity<Map<String, Object>> react(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {

        User user = resolveUser(auth);
        String reactionType = body != null ? body.getOrDefault("reaction", "like") : "like";

        boolean added = broadcastService.toggleReaction(id, user.getId(), reactionType);

        return ResponseEntity.ok(Map.of(
            "insightId", id,
            "reaction",  reactionType,
            "added",     added
        ));
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    private User resolveUser(Authentication auth) {
        String email = auth.getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + email));
    }
}
