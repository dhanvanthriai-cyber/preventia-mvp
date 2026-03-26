package com.preventia.insights.repository;

import com.preventia.insights.domain.InsightReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InsightReactionRepository extends JpaRepository<InsightReaction, Long> {

    /** Count reactions of a given type on a specific insight. */
    long countByInsightIdAndReaction(Long insightId, String reaction);

    /** All reactions from a specific user on a specific insight. */
    List<InsightReaction> findByInsightIdAndUserId(Long insightId, Long userId);

    /** Find a specific reaction (for toggle/upsert logic). */
    Optional<InsightReaction> findByInsightIdAndUserIdAndReaction(Long insightId, Long userId, String reaction);
}
