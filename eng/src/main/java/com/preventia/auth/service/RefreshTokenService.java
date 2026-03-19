package com.preventia.auth.service;

import com.preventia.auth.domain.RefreshToken;
import com.preventia.auth.repository.RefreshTokenRepository;
import com.preventia.family.domain.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * RefreshTokenService — issues and rotates long-lived refresh tokens.
 *
 * Rotation pattern:
 *  1. Client presents refresh token T1
 *  2. Service validates T1 (exists + not expired) → deletes T1
 *  3. Service creates T2, returns it alongside a new access JWT
 *
 * If T1 is unknown or expired → throws IllegalArgumentException (→ HTTP 401).
 * This invalidates replayed tokens automatically (T1 is gone after first use).
 *
 * TTL: 30 days from issuance.
 */
@Service
public class RefreshTokenService {

    /** 30-day TTL for refresh tokens. */
    private static final long REFRESH_TTL_DAYS = 30;

    private final RefreshTokenRepository refreshTokenRepo;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepo) {
        this.refreshTokenRepo = refreshTokenRepo;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * Creates and persists a new refresh token for the given user.
     * Called immediately after successful login or register.
     */
    @Transactional
    public RefreshToken createForUser(User user) {
        RefreshToken rt = new RefreshToken();
        rt.setUser(user);
        rt.setToken(UUID.randomUUID().toString());
        rt.setExpiresAt(Instant.now().plus(REFRESH_TTL_DAYS, ChronoUnit.DAYS));
        return refreshTokenRepo.save(rt);
    }

    // ── Rotate ────────────────────────────────────────────────────────────────

    /**
     * Validates the incoming refresh token, deletes it (consume-once), and
     * issues a fresh replacement.
     *
     * @throws IllegalArgumentException if the token is unknown or expired
     */
    @Transactional
    public RefreshToken rotate(String rawToken) {
        RefreshToken existing = refreshTokenRepo.findByToken(rawToken)
            .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));

        if (existing.getExpiresAt().isBefore(Instant.now())) {
            refreshTokenRepo.delete(existing);
            throw new IllegalArgumentException("Refresh token has expired");
        }

        User user = existing.getUser();

        // Delete the consumed token (rotation: T1 → gone)
        refreshTokenRepo.delete(existing);
        refreshTokenRepo.flush(); // ensure delete lands before insert

        // Issue replacement (T2)
        return createForUser(user);
    }

    // ── Revoke ────────────────────────────────────────────────────────────────

    /**
     * Revokes all refresh tokens for a user — call on logout or password change.
     */
    @Transactional
    public void revokeAll(Long userId) {
        refreshTokenRepo.deleteAllByUserId(userId);
    }
}
