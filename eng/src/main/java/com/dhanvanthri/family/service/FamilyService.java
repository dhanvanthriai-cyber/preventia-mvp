package com.dhanvanthri.family.service;

import com.dhanvanthri.family.domain.FamilyRelationship;
import com.dhanvanthri.family.domain.FamilyRelationship.ConsentStatus;
import com.dhanvanthri.family.domain.User;
import com.dhanvanthri.family.dto.FamilyLinkRequest;
import com.dhanvanthri.family.dto.FamilyLinkResponse;
import com.dhanvanthri.family.repository.FamilyRelationshipRepository;
import com.dhanvanthri.auth.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional
public class FamilyService {

    private final FamilyRelationshipRepository relationshipRepo;
    private final UserRepository userRepo;

    public FamilyService(FamilyRelationshipRepository relationshipRepo, UserRepository userRepo) {
        this.relationshipRepo = relationshipRepo;
        this.userRepo = userRepo;
    }

    /**
     * Sponsor initiates a link. Status starts as PENDING until Recipient grants consent.
     */
    public FamilyLinkResponse initiateLink(FamilyLinkRequest request) {
        User sponsor = userRepo.findById(request.sponsorId())
            .orElseThrow(() -> new IllegalArgumentException("Sponsor not found: " + request.sponsorId()));
        User recipient = userRepo.findById(request.recipientId())
            .orElseThrow(() -> new IllegalArgumentException("Recipient not found: " + request.recipientId()));

        FamilyRelationship rel = new FamilyRelationship();
        rel.setSponsor(sponsor);
        rel.setRecipient(recipient);
        rel.setConsentStatus(ConsentStatus.PENDING);

        FamilyRelationship saved = relationshipRepo.save(rel);
        return toResponse(saved);
    }

    /**
     * Recipient grants EMR access to the linked Sponsor.
     */
    public FamilyLinkResponse grantConsent(Long relationshipId) {
        FamilyRelationship rel = relationshipRepo.findById(relationshipId)
            .orElseThrow(() -> new IllegalArgumentException("Relationship not found: " + relationshipId));

        rel.setConsentStatus(ConsentStatus.GRANTED);
        rel.setGrantedAt(Instant.now());
        return toResponse(relationshipRepo.save(rel));
    }

    /**
     * Recipient revokes consent — Sponsor access is immediately terminated.
     */
    public FamilyLinkResponse revokeConsent(Long relationshipId) {
        FamilyRelationship rel = relationshipRepo.findById(relationshipId)
            .orElseThrow(() -> new IllegalArgumentException("Relationship not found: " + relationshipId));

        rel.setConsentStatus(ConsentStatus.REVOKED);
        return toResponse(relationshipRepo.save(rel));
    }

    @Transactional(readOnly = true)
    public List<FamilyLinkResponse> getLinksForSponsor(Long sponsorId) {
        return relationshipRepo.findBySponsorId(sponsorId).stream()
            .map(this::toResponse)
            .toList();
    }

    private FamilyLinkResponse toResponse(FamilyRelationship r) {
        return new FamilyLinkResponse(
            r.getId(),
            r.getSponsor().getId(), r.getSponsor().getName(),
            r.getRecipient().getId(), r.getRecipient().getName(),
            r.getConsentStatus(),
            r.getGrantedAt(),
            r.getCreatedAt()
        );
    }
}
