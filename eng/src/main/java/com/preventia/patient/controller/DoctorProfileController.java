package com.preventia.patient.controller;

import com.preventia.auth.repository.UserRepository;
import com.preventia.family.domain.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * DoctorProfileController — doctor self-service profile settings.
 *
 * PUT /api/v1/doctors/me/rate         — update hourly consultation fee (INR)
 * PUT /api/v1/doctors/me/availability — toggle accepting new appointments
 * GET /api/v1/doctors/me              — get current doctor profile
 *
 * All endpoints are DOCTOR-only. The doctor's ID is derived from the JWT
 * principal to prevent IDOR.
 */
@RestController
@RequestMapping("/api/v1/doctors/me")
@PreAuthorize("hasRole('DOCTOR')")
public class DoctorProfileController {

    private final UserRepository userRepository;

    public DoctorProfileController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/doctors/me
    // -------------------------------------------------------------------------

    @GetMapping
    public ResponseEntity<Map<String, Object>> getProfile(Authentication auth) {
        User doctor = resolveDoctor(auth);
        return ResponseEntity.ok(Map.of(
            "id",                 doctor.getId(),
            "name",               doctor.getName(),
            "email",              doctor.getEmail(),
            "hourlyRateInr",      doctor.getHourlyRateInr() != null ? doctor.getHourlyRateInr() : 2500,
            "acceptingPatients",  doctor.getAcceptingPatients() != null ? doctor.getAcceptingPatients() : true
        ));
    }

    // -------------------------------------------------------------------------
    // PUT /api/v1/doctors/me/rate
    // Body: { "rateInr": 3000 }
    // -------------------------------------------------------------------------

    @PutMapping("/rate")
    public ResponseEntity<Map<String, Object>> updateRate(
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        Object raw = body.get("rateInr");
        if (raw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rateInr is required");
        }
        int rate = Integer.parseInt(raw.toString());
        if (rate < 0 || rate > 100_000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rateInr must be between 0 and 100000");
        }

        User doctor = resolveDoctor(auth);
        doctor.setHourlyRateInr(rate);
        userRepository.save(doctor);

        return ResponseEntity.ok(Map.of(
            "hourlyRateInr", rate,
            "status",        "updated"
        ));
    }

    // -------------------------------------------------------------------------
    // PUT /api/v1/doctors/me/availability
    // Body: { "accepting": true }
    // -------------------------------------------------------------------------

    @PutMapping("/availability")
    public ResponseEntity<Map<String, Object>> updateAvailability(
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        Object raw = body.get("accepting");
        if (raw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "accepting is required");
        }
        boolean accepting = Boolean.parseBoolean(raw.toString());

        User doctor = resolveDoctor(auth);
        doctor.setAcceptingPatients(accepting);
        userRepository.save(doctor);

        return ResponseEntity.ok(Map.of(
            "acceptingPatients", accepting,
            "status",            "updated"
        ));
    }

    // -------------------------------------------------------------------------

    private User resolveDoctor(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found"));
    }
}
