package com.dhanvanthri.auth.repository;

import com.dhanvanthri.auth.domain.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    /** Lookup by opaque token value (the primary query path). */
    Optional<RefreshToken> findByToken(String token);

    /** Delete all refresh tokens for a user — used on logout / account revocation. */
    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.user.id = :userId")
    void deleteAllByUserId(Long userId);

    /** Purge tokens that have already passed their expiry — for periodic cleanup. */
    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.expiresAt < :now")
    void deleteAllExpiredBefore(Instant now);
}
