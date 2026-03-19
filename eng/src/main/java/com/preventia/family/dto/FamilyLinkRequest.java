package com.preventia.family.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Request body for a Sponsor initiating a family link with a Recipient.
 */
public record FamilyLinkRequest(
    @NotNull Long sponsorId,
    @NotNull Long recipientId
) {}
