package com.preventia.family.controller;

import com.preventia.family.dto.FamilyLinkRequest;
import com.preventia.family.dto.FamilyLinkResponse;
import com.preventia.family.service.FamilyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/family")
public class FamilyController {

    private final FamilyService familyService;

    public FamilyController(FamilyService familyService) {
        this.familyService = familyService;
    }

    /** SPONSOR initiates a link with a PATIENT/Recipient. */
    @PostMapping("/link")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('SPONSOR')")
    public FamilyLinkResponse initiateLink(@Valid @RequestBody FamilyLinkRequest request) {
        return familyService.initiateLink(request);
    }

    /** RECIPIENT grants the Sponsor read access to their EMR. */
    @PatchMapping("/{id}/grant")
    @PreAuthorize("hasRole('RECIPIENT')")
    public FamilyLinkResponse grantConsent(@PathVariable Long id) {
        return familyService.grantConsent(id);
    }

    /** RECIPIENT revokes previously granted access. */
    @PatchMapping("/{id}/revoke")
    @PreAuthorize("hasRole('RECIPIENT')")
    public FamilyLinkResponse revokeConsent(@PathVariable Long id) {
        return familyService.revokeConsent(id);
    }

    /** SPONSOR views all their linked recipients. */
    @GetMapping("/sponsor/{sponsorId}")
    @PreAuthorize("hasRole('SPONSOR') or hasRole('DOCTOR')")
    public List<FamilyLinkResponse> getSponsorLinks(@PathVariable Long sponsorId) {
        return familyService.getLinksForSponsor(sponsorId);
    }
}
