package com.preventia.ops.controller;

import com.preventia.auth.repository.UserRepository;
import com.preventia.family.domain.User;
import com.preventia.ops.domain.ConsultationFeedback;
import com.preventia.ops.repository.ConsultationFeedbackRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * FeedbackController — patient submits a post-consultation satisfaction rating.
 *
 * POST /api/v1/feedback/consultation
 * Body: { "appointmentId": 42, "rating": 4, "comment": "Great doctor!" }
 *
 * Sprint-10: CONSULT-009
 */
@RestController
@RequestMapping("/api/v1/feedback")
public class FeedbackController {

    private final ConsultationFeedbackRepository feedbackRepository;
    private final UserRepository                 userRepository;

    public FeedbackController(ConsultationFeedbackRepository feedbackRepository,
                               UserRepository userRepository) {
        this.feedbackRepository = feedbackRepository;
        this.userRepository     = userRepository;
    }

    @PostMapping("/consultation")
    @PreAuthorize("hasAnyRole('RECIPIENT', 'SPONSOR')")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<Map<String, Object>> submitFeedback(
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        Long userId        = resolveUserId(auth);
        Long appointmentId = Long.parseLong(body.get("appointmentId").toString());
        int  rating        = Integer.parseInt(body.getOrDefault("rating", "0").toString());
        String comment     = (String) body.get("comment");

        if (rating < 1 || rating > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rating must be between 1 and 5");
        }

        // Idempotent — if already submitted, return existing
        if (feedbackRepository.existsByAppointmentIdAndUserId(appointmentId, userId)) {
            return ResponseEntity.ok(Map.of("status", "already_submitted"));
        }

        ConsultationFeedback feedback = new ConsultationFeedback(appointmentId, userId, rating, comment);
        feedbackRepository.save(feedback);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "status",        "submitted",
            "appointmentId", appointmentId,
            "rating",        rating
        ));
    }

    private Long resolveUserId(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
            .map(User::getId)
            .orElseThrow(() -> new IllegalStateException("User not found"));
    }
}
