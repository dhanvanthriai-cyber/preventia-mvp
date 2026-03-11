package com.dhanvanthri.family.dto;

import com.dhanvanthri.family.domain.FamilyRelationship.ConsentStatus;
import java.time.Instant;

/**
 * Response projection for a family relationship record.
 */
public record FamilyLinkResponse(
    Long id,
    Long sponsorId,
    String sponsorName,
    Long recipientId,
    String recipientName,
    ConsentStatus consentStatus,
    Instant grantedAt,
    Instant createdAt
) {}
