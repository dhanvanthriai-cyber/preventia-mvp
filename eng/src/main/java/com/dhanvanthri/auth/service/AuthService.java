package com.dhanvanthri.auth.service;

import com.dhanvanthri.auth.dto.JwtResponse;
import com.dhanvanthri.auth.dto.LoginRequest;
import com.dhanvanthri.auth.dto.RegisterRequest;
import com.dhanvanthri.auth.repository.UserRepository;
import com.dhanvanthri.family.domain.User;
import com.dhanvanthri.shared.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthService {

    private final AuthenticationManager authManager;
    private final JwtTokenProvider jwtProvider;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    public AuthService(AuthenticationManager authManager,
                       JwtTokenProvider jwtProvider,
                       UserRepository userRepo,
                       PasswordEncoder passwordEncoder) {
        this.authManager = authManager;
        this.jwtProvider = jwtProvider;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Authenticates credentials and issues a signed JWT.
     * The JWT embeds the user's Role for downstream RBAC checks.
     */
    public JwtResponse login(LoginRequest request) {
        Authentication auth = authManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );
        User user = userRepo.findByEmail(request.email())
            .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));

        String token = jwtProvider.generateToken(auth, user.getRole().name());
        return new JwtResponse(token, jwtProvider.getExpirationSeconds(), user.getRole().name());
    }

    /**
     * Registers a new user and immediately issues a signed JWT so the
     * client is authenticated without a second round-trip.
     *
     * @throws IllegalStateException if the email is already in use (→ 409 Conflict)
     */
    public JwtResponse register(RegisterRequest request) {
        if (userRepo.existsByEmail(request.email())) {
            throw new IllegalStateException("Email already registered");
        }

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(request.role());

        userRepo.save(user);

        // Build a lightweight Authentication just to satisfy JwtTokenProvider#generateToken,
        // which only needs getName() (= email) and the role claim.
        Authentication auth = new UsernamePasswordAuthenticationToken(
            user.getEmail(), null, List.of()
        );
        String token = jwtProvider.generateToken(auth, user.getRole().name());
        return new JwtResponse(token, jwtProvider.getExpirationSeconds(), user.getRole().name());
    }
}
