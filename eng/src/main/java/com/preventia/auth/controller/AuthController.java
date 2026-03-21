package com.preventia.auth.controller;

import com.preventia.auth.dto.BootstrapAdminRequest;
import com.preventia.auth.domain.RefreshToken;
import com.preventia.auth.dto.JwtResponse;
import com.preventia.auth.dto.LoginRequest;
import com.preventia.auth.dto.RefreshRequest;
import com.preventia.auth.dto.RefreshResponse;
import com.preventia.auth.dto.RegisterRequest;
import com.preventia.auth.dto.SocialLoginRequest;
import com.preventia.auth.repository.UserRepository;
import com.preventia.auth.service.AuthService;
import com.preventia.auth.service.RefreshTokenService;
import com.preventia.auth.service.SocialAuthService;
import com.preventia.family.domain.User;
import com.preventia.shared.security.JwtTokenProvider;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService         authService;
    private final RefreshTokenService refreshTokenService;
    private final SocialAuthService socialAuthService;
    private final JwtTokenProvider    jwtProvider;
    private final UserRepository      userRepository;
    private final String              adminBootstrapSecret;

    public AuthController(AuthService authService,
                          RefreshTokenService refreshTokenService,
                          SocialAuthService socialAuthService,
                          JwtTokenProvider jwtProvider,
                          UserRepository userRepository,
                          @Value("${app.admin.bootstrap-secret:}") String adminBootstrapSecret) {
        this.authService         = authService;
        this.refreshTokenService = refreshTokenService;
        this.socialAuthService   = socialAuthService;
        this.jwtProvider         = jwtProvider;
        this.userRepository      = userRepository;
        this.adminBootstrapSecret = adminBootstrapSecret;
    }

    /**
     * GET /api/v1/auth/me
     * Returns the current user's DB id, name, role and email.
     * The JWT only carries sub=email; this bridges the gap so the
     * frontend can get the numeric userId for appointment queries etc.
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalStateException("User not found: " + email));
        Map<String, Object> me = new LinkedHashMap<>();
        me.put("userId", user.getId());
        me.put("name", user.getName());
        me.put("role", user.getRole().name());
        me.put("email", user.getEmail());
        return ResponseEntity.ok(me);
    }

    /**
     * GET /api/v1/auth/doctors
     * Returns a lightweight directory of doctors for appointment booking.
     */
    @GetMapping("/doctors")
    public ResponseEntity<List<Map<String, Object>>> doctors() {
        List<Map<String, Object>> doctors = userRepository.findAllByRoleOrderByNameAsc(User.Role.DOCTOR)
            .stream()
            .map(user -> {
                Map<String, Object> doctor = new LinkedHashMap<>();
                doctor.put("id", user.getId());
                doctor.put("name", user.getName());
                doctor.put("email", user.getEmail());
                return doctor;
            })
            .toList();
        return ResponseEntity.ok(doctors);
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

    @PostMapping("/social/google")
    public ResponseEntity<JwtResponse> socialGoogle(@Valid @RequestBody SocialLoginRequest request) {
        JwtResponse response = socialAuthService.authenticateWithGoogle(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/social/apple")
    public ResponseEntity<JwtResponse> socialApple(@Valid @RequestBody SocialLoginRequest request) {
        JwtResponse response = socialAuthService.authenticateWithApple(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/bootstrap-admin")
    public ResponseEntity<JwtResponse> bootstrapAdmin(
            @RequestHeader(value = "X-Admin-Bootstrap-Secret", required = false) String suppliedSecret,
            @Valid @RequestBody BootstrapAdminRequest request) {
        if (adminBootstrapSecret == null || adminBootstrapSecret.isBlank()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (suppliedSecret == null || !MessageDigest.isEqual(
            adminBootstrapSecret.getBytes(StandardCharsets.UTF_8),
            suppliedSecret.getBytes(StandardCharsets.UTF_8)
        )) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        JwtResponse response = authService.bootstrapAdmin(request);
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
        String newAccessToken = jwtProvider.generateToken(auth, user.getRole().name(), user.getId());

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

    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<String> handleForbidden(UnsupportedOperationException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ex.getMessage());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<String> handleAuthenticationFailure(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid email or password");
    }
}
