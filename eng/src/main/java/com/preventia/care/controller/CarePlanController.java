package com.preventia.care.controller;

import com.preventia.auth.repository.UserRepository;
import com.preventia.care.dto.CarePlanRequest;
import com.preventia.care.dto.CarePlanResponse;
import com.preventia.care.service.CarePlanService;
import com.preventia.family.domain.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for Care Plans (CONSULT-007).
 *
 * POST   /api/v1/care-plans                      — DOCTOR: create care plan
 * GET    /api/v1/care-plans?patientId={id}        — DOCTOR: list plans for patient
 * DELETE /api/v1/care-plans/{id}                  — DOCTOR: deactivate plan
 * POST   /api/v1/care-plans/{id}/response         — RECIPIENT: log a response
 */
@RestController
@RequestMapping("/api/v1/care-plans")
public class CarePlanController {

    private final CarePlanService carePlanService;
    private final UserRepository  userRepository;

    public CarePlanController(CarePlanService carePlanService, UserRepository userRepository) {
        this.carePlanService = carePlanService;
        this.userRepository  = userRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('DOCTOR')")
    public CarePlanResponse create(@Valid @RequestBody CarePlanRequest req, Authentication auth) {
        Long doctorId = resolveUserId(auth);
        return carePlanService.create(doctorId, req);
    }

    @GetMapping
    @PreAuthorize("hasRole('DOCTOR')")
    public List<CarePlanResponse> list(
            @RequestParam Long patientId,
            Authentication auth) {
        Long doctorId = resolveUserId(auth);
        return carePlanService.getByPatient(doctorId, patientId);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id, Authentication auth) {
        carePlanService.deactivate(id, resolveUserId(auth));
        return ResponseEntity.noContent().build();
    }

    /** Patient logs a manual response (or triggered by Stream webhook). */
    @PostMapping("/{id}/response")
    @PreAuthorize("hasRole('RECIPIENT')")
    public ResponseEntity<Map<String, String>> respond(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String text      = body.getOrDefault("responseText", "");
        String messageId = body.get("streamMessageId");
        carePlanService.recordResponse(id, text, messageId);
        return ResponseEntity.ok(Map.of("status", "recorded"));
    }

    private Long resolveUserId(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
            .map(User::getId)
            .orElseThrow(() -> new IllegalStateException("User not found: " + auth.getName()));
    }
}
