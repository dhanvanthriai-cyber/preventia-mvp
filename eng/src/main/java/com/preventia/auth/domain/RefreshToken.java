package com.preventia.auth.domain;

import com.preventia.family.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Persistent refresh token — one row per issued token.
 *
 * Rotation pattern: when a refresh token is consumed (via POST /auth/refresh),
 * the old row is deleted and a new one is inserted atomically.  Any attempt
 * to reuse a consumed token results in HTTP 401, which also signals a potential
 * replay attack.
 *
 * TTL: 30 days (enforced by expiresAt, not by DB TTL — keeps the schema
 * portable across PostgreSQL versions).
 */
@Entity
@Table(
    name = "refresh_tokens",
    indexes = {
        @Index(name = "idx_refresh_tokens_token",   columnList = "token"),
        @Index(name = "idx_refresh_tokens_user_id", columnList = "user_id"),
    }
)
public class RefreshToken {

    @Id
    @Column(columnDefinition = "UUID")
    private UUID id;

    /** The user this token belongs to. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** The opaque token value — UUID-based, stored as VARCHAR for portability. */
    @Column(nullable = false, unique = true)
    private String token;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @PrePersist
    private void prePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }

    // ── Getters / setters ─────────────────────────────────────────────────────

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
