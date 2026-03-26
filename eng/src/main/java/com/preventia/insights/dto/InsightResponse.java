package com.preventia.insights.dto;

import com.preventia.insights.domain.LifestyleInsight;

import java.time.Instant;

/**
 * Response DTO for lifestyle insight endpoints.
 *
 * likeCount is populated at query time; not stored on the entity itself.
 */
public record InsightResponse(
    Long    id,
    Long    doctorId,
    String  doctorName,
    String  category,
    String  title,
    String  body,
    Instant createdAt,
    long    likeCount,
    boolean likedByMe
) {
    /** Factory: maps entity → DTO with zero engagement (for simple POST response). */
    public static InsightResponse from(LifestyleInsight insight) {
        return new InsightResponse(
            insight.getId(),
            insight.getDoctorId(),
            insight.getDoctorName(),
            insight.getCategory(),
            insight.getTitle(),
            insight.getBody(),
            insight.getCreatedAt(),
            0L,
            false
        );
    }

    /** Factory: maps entity → DTO with pre-computed engagement counts. */
    public static InsightResponse from(LifestyleInsight insight, long likeCount, boolean likedByMe) {
        return new InsightResponse(
            insight.getId(),
            insight.getDoctorId(),
            insight.getDoctorName(),
            insight.getCategory(),
            insight.getTitle(),
            insight.getBody(),
            insight.getCreatedAt(),
            likeCount,
            likedByMe
        );
    }
}
