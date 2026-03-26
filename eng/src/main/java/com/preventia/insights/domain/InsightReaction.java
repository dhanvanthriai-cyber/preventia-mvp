package com.preventia.insights.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Patient engagement reaction on a lifestyle insight (e.g. "like").
 * Maps to: insight_reactions table (V23 migration).
 *
 * Uniqueness constraint (insight_id, user_id, reaction) is enforced at the DB level.
 */
@Entity
@Table(name = "insight_reactions")
public class InsightReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "insight_id", nullable = false)
    private Long insightId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Reaction type — currently only "like". Extensible to "helpful", "saved", etc. */
    @Column(name = "reaction", nullable = false, length = 20)
    private String reaction;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected InsightReaction() {}

    public InsightReaction(Long insightId, Long userId, String reaction) {
        this.insightId = insightId;
        this.userId    = userId;
        this.reaction  = reaction == null || reaction.isBlank() ? "like" : reaction;
        this.createdAt = Instant.now();
    }

    public Long    getId()        { return id; }
    public Long    getInsightId() { return insightId; }
    public Long    getUserId()    { return userId; }
    public String  getReaction()  { return reaction; }
    public Instant getCreatedAt() { return createdAt; }
}
