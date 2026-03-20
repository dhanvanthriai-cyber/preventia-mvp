package com.preventia.family.dto;

/**
 * Response projection for a family_members row.
 * photoUrl is null until a photo is uploaded via the dedicated upload endpoint.
 */
public record FamilyMemberResponse(
    Long   id,
    String firstName,
    String lastName,
    String fullName,
    String initials,
    String dateOfBirth,   // ISO date "YYYY-MM-DD" or null
    String phone,
    String email,
    String address,
    String relationship,  // RelationshipType name: CHILD | PARENT | SPOUSE | OTHER
    String photoUrl,      // pre-signed S3 URL — null until photo is uploaded
    String careStatus,    // CareStatus name: ACTIVE | CARE_UPDATED | PENDING_LAB | UP_TO_DATE
    String createdAt      // ISO-8601 instant
) {}
