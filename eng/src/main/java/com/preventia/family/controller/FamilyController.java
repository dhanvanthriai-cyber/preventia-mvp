package com.preventia.family.controller;

import com.preventia.auth.repository.UserRepository;
import com.preventia.family.domain.User;
import com.preventia.family.dto.AddFamilyMemberRequest;
import com.preventia.family.dto.FamilyLinkRequest;
import com.preventia.family.dto.FamilyLinkResponse;
import com.preventia.family.dto.FamilyMemberResponse;
import com.preventia.family.service.FamilyMemberService;
import com.preventia.family.service.FamilyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/family")
public class FamilyController {

    private final FamilyService       familyService;
    private final FamilyMemberService familyMemberService;
    private final UserRepository      userRepository;

    public FamilyController(FamilyService familyService,
                            FamilyMemberService familyMemberService,
                            UserRepository userRepository) {
        this.familyService       = familyService;
        this.familyMemberService = familyMemberService;
        this.userRepository      = userRepository;
    }

    // =========================================================================
    // Family Member sub-profiles — RECIPIENT-owned dependent profiles
    // =========================================================================

    /**
     * GET /api/v1/family/members
     * Returns all dependent family member profiles owned by the authenticated RECIPIENT.
     * Owner identity is resolved from the JWT subject (email) in the security context.
     */
    @GetMapping("/members")
    @PreAuthorize("hasRole('RECIPIENT')")
    public List<FamilyMemberResponse> getMyFamilyMembers(Authentication auth) {
        return familyMemberService.getMembers(resolveOwner(auth).getId());
    }

    /**
     * POST /api/v1/family/members
     * Adds a new dependent family member profile for the authenticated RECIPIENT.
     */
    @PostMapping("/members")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('RECIPIENT')")
    public FamilyMemberResponse addFamilyMember(@Valid @RequestBody AddFamilyMemberRequest request,
                                                Authentication auth) {
        return familyMemberService.addMember(resolveOwner(auth).getId(), request);
    }

    /**
     * DELETE /api/v1/family/members/{id}
     * Removes a family member profile. Ownership is verified before deletion.
     */
    @DeleteMapping("/members/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('RECIPIENT')")
    public void removeFamilyMember(@PathVariable Long id, Authentication auth) {
        familyMemberService.deleteMember(resolveOwner(auth).getId(), id);
    }

    // =========================================================================
    // Tri-Party Consent Links — Sponsor ↔ Recipient (unchanged)
    // =========================================================================

    @PostMapping("/link")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('SPONSOR')")
    public FamilyLinkResponse initiateLink(@Valid @RequestBody FamilyLinkRequest request) {
        return familyService.initiateLink(request);
    }

    @PatchMapping("/{id}/grant")
    @PreAuthorize("hasRole('RECIPIENT')")
    public FamilyLinkResponse grantConsent(@PathVariable Long id) {
        return familyService.grantConsent(id);
    }

    @PatchMapping("/{id}/revoke")
    @PreAuthorize("hasRole('RECIPIENT')")
    public FamilyLinkResponse revokeConsent(@PathVariable Long id) {
        return familyService.revokeConsent(id);
    }

    @GetMapping("/sponsor/{sponsorId}")
    @PreAuthorize("hasRole('SPONSOR') or hasRole('DOCTOR')")
    public List<FamilyLinkResponse> getSponsorLinks(@PathVariable Long sponsorId) {
        return familyService.getLinksForSponsor(sponsorId);
    }

    // =========================================================================
    // Helper
    // =========================================================================

    /** Resolve the authenticated user's email (JWT subject) to a User entity. */
    private User resolveOwner(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Authenticated user not found in database: " + auth.getName()));
    }
}
