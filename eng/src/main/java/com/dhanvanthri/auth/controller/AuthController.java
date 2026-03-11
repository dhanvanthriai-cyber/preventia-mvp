package com.dhanvanthri.auth.controller;

import com.dhanvanthri.auth.dto.JwtResponse;
import com.dhanvanthri.auth.dto.LoginRequest;
import com.dhanvanthri.auth.dto.RegisterRequest;
import com.dhanvanthri.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * POST /api/v1/auth/login
     * Public endpoint — returns JWT on valid credentials.
     */
    @PostMapping("/login")
    public JwtResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /**
     * POST /api/v1/auth/register
     * Public endpoint — creates a new user account and returns a JWT immediately.
     * Returns 201 Created on success; 409 Conflict if the email is already in use.
     */
    @PostMapping("/register")
    public ResponseEntity<JwtResponse> register(@Valid @RequestBody RegisterRequest request) {
        JwtResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Converts IllegalStateException thrown by AuthService#register into a
     * 409 Conflict response, keeping the error message surfaced as plain text.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleConflict(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }
}
