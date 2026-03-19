package com.preventia.auth.service;

import com.preventia.auth.domain.RefreshToken;
import com.preventia.auth.dto.BootstrapAdminRequest;
import com.preventia.auth.dto.JwtResponse;
import com.preventia.auth.dto.LoginRequest;
import com.preventia.auth.dto.RegisterRequest;
import com.preventia.auth.repository.UserRepository;
import com.preventia.family.domain.User;
import com.preventia.shared.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuthService {

    private final AuthenticationManager authManager;
    private final JwtTokenProvider       jwtProvider;
    private final UserRepository         userRepo;
    private final PasswordEncoder        passwordEncoder;
    private final RefreshTokenService    refreshTokenService;

    public AuthService(AuthenticationManager authManager,
                       JwtTokenProvider jwtProvider,
                       UserRepository userRepo,
                       PasswordEncoder passwordEncoder,
                       RefreshTokenService refreshTokenService) {
        this.authManager         = authManager;
        this.jwtProvider         = jwtProvider;
        this.userRepo            = userRepo;
        this.passwordEncoder     = passwordEncoder;
        this.refreshTokenService = refreshTokenService;
    }

    /**
     * Authenticates credentials, issues a signed JWT, and creates a refresh token.
     * The JWT embeds the user's Role for downstream RBAC checks.
     */
    @Transactional
    public JwtResponse login(LoginRequest request) {
        Authentication auth = authManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );
        User user = userRepo.findByEmail(request.email())
            .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));

        String accessToken = jwtProvider.generateToken(auth, user.getRole().name());
        RefreshToken refreshToken = refreshTokenService.createForUser(user);

        return new JwtResponse(
            accessToken,
            jwtProvider.getExpirationSeconds(),
            user.getRole().name(),
            refreshToken.getToken()
        );
    }

    /**
     * Registers a new user, immediately issues a signed JWT, and creates a
     * refresh token so the client is fully authenticated without a second round-trip.
     *
     * @throws IllegalStateException if the email is already in use (→ 409 Conflict)
     */
    @Transactional
    public JwtResponse register(RegisterRequest request) {
        if (request.role() == User.Role.ADMIN) {
            throw new UnsupportedOperationException("Admin accounts cannot be created through public signup.");
        }

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
        String accessToken = jwtProvider.generateToken(auth, user.getRole().name());
        RefreshToken refreshToken = refreshTokenService.createForUser(user);

        return new JwtResponse(
            accessToken,
            jwtProvider.getExpirationSeconds(),
            user.getRole().name(),
            refreshToken.getToken()
        );
    }

    @Transactional
    public JwtResponse bootstrapAdmin(BootstrapAdminRequest request) {
        if (userRepo.countByRole(User.Role.ADMIN) > 0) {
            throw new UnsupportedOperationException("An admin account already exists.");
        }
        if (userRepo.existsByEmail(request.email())) {
            throw new IllegalStateException("Email already registered");
        }

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(User.Role.ADMIN);
        userRepo.save(user);

        Authentication auth = new UsernamePasswordAuthenticationToken(
            user.getEmail(), null, List.of()
        );
        String accessToken = jwtProvider.generateToken(auth, user.getRole().name());
        RefreshToken refreshToken = refreshTokenService.createForUser(user);

        return new JwtResponse(
            accessToken,
            jwtProvider.getExpirationSeconds(),
            user.getRole().name(),
            refreshToken.getToken()
        );
    }
}
