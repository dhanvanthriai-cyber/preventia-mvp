package com.preventia.family.dto;

import com.preventia.family.domain.FamilyMember.RelationshipType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for POST /api/v1/family/members.
 * dateOfBirth is an optional ISO date string (YYYY-MM-DD).
 */
public record AddFamilyMemberRequest(
    @NotBlank String firstName,
    @NotBlank String lastName,
    String dateOfBirth,
    String phone,
    String email,
    String address,
    @NotNull RelationshipType relationship
) {}
