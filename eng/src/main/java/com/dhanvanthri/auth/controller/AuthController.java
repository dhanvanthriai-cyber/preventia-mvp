package com.dhanvanthri.auth.controller;

import com.dhanvanthri.auth.domain.RefreshToken;
import com.dhanvanthri.auth.dto.JwtResponse;
import com.dhanvanthri.auth.dto.LoginRequest;
import com.dhanvanthri.auth.dto.RefreshRequest;
import com.dhanvanthri.auth.dto.RefreshResponse;
import com.dhanvanthri.auth.dto.RegisterRequest;
import com.dhanvanthri.auth.service.AuthService;
import com.dhanvanthri.auth.service.RefreshTokenService;
import com.dhanvanthri.family.domain.User;
import com.dhanvanthri.shared.security.JwtTokenProvider;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService         authService;
    private final RefreshTokenService refreshTokenService;
    private final JwtTokenProvider    jwtProvider;

    public AuthController(AuthService authService,
                          RefreshTokenService refreshTokenService,
                          JwtTokenProvider jwtProvider) {
        this.authService         = authService;
        this.refreshTokenService = refreshTokenService;
        this.jwtProvider         = jwtProvider;
    }

    /**
     * POST /api/v1/auth/login
     * Public endpoint — returns JWT + refresh token on valid credentials.
     */
    @PostMapping("/login")
    public JwtResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /**
     * POST /api/v1/auth/register
     * Public endpoint — creates a new user account and returns JWT + refresh token.
     * Returns 201 Created on success; 409 Conflict if the email is already in use.
     */
    @PostMapping("/register")
    public ResponseEntity<JwtResponse> register(@Valid @RequestBody RegisterRequest request) {
        JwtResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * POST /api/v1/auth/refresh
     * Public endpoint (whitelisted in SecurityConfig).
     *
     * Validates the provided refresh token, rotates it (deletes old, issues new),
     * and returns a fresh access JWT alongside the new refresh token.
     *
     * HTTP 401 if the token is unknown, expired, or already consumed.
     */
    @PostMapping("/refresh")
    public ResponseEntity<RefreshResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        RefreshToken rotated = refreshTokenService.rotate(request.refreshToken());

        User user = rotated.getUser();

        // Build Authentication just to satisfy JwtTokenProvider#generateToken
        Authentication auth = new UsernamePasswordAuthenticationToken(
            user.getEmail(), null, List.of()
        );
        String newAccessToken = jwtProvider.generateToken(auth, user.getRole().name());

        RefreshResponse response = new RefreshResponse(
            newAccessToken,
            jwtProvider.getExpirationSeconds(),
            user.getRole().name(),
            rotated.getToken()
        );
        return ResponseEntity.ok(response);
    }

    // ── Exception handlers ────────────────────────────────────────────────────

    /**
     * Maps IllegalStateException (email already registered) → 409 Conflict.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleConflict(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }

    /**
     * Maps IllegalArgumentException (invalid/expired refresh token) → 401.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleUnauthorized(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ex.getMessage());
    }
}
