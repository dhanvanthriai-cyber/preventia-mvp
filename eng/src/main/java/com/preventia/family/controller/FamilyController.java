package com.preventia.family.controller;

import com.preventia.auth.repository.UserRepository;
import com.preventia.family.domain.FamilyMember;
import com.preventia.family.domain.User;
import com.preventia.family.dto.AddFamilyMemberRequest;
import com.preventia.family.dto.FamilyLinkRequest;
import com.preventia.family.dto.FamilyLinkResponse;
import com.preventia.family.dto.FamilyMemberResponse;
import com.preventia.family.repository.FamilyMemberRepository;
import com.preventia.family.service.FamilyMemberService;
import com.preventia.family.service.FamilyService;
import com.preventia.shared.service.S3Service;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/family")
public class FamilyController {

    private final FamilyService             familyService;
    private final FamilyMemberService       familyMemberService;
    private final FamilyMemberRepository    familyMemberRepository;
    private final UserRepository            userRepository;
    private final S3Service                 s3Service;

    public FamilyController(FamilyService familyService,
                            FamilyMemberService familyMemberService,
                            FamilyMemberRepository familyMemberRepository,
                            UserRepository userRepository,
                            S3Service s3Service) {
        this.familyService          = familyService;
        this.familyMemberService    = familyMemberService;
        this.familyMemberRepository = familyMemberRepository;
        this.userRepository         = userRepository;
        this.s3Service              = s3Service;
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

    /**
     * POST /api/v1/family/members/{id}/photo
     * Uploads a profile photo for a family member.
     * Accepted types: image/jpeg, image/png, image/webp. Max size: 5 MB.
     * Returns the pre-signed S3 URL (15-min expiry) and the stored S3 key.
     */
    @PostMapping(value = "/members/{id}/photo", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize("hasRole('RECIPIENT')")
    public Map<String, String> uploadMemberPhoto(@PathVariable Long id,
                                                 @RequestParam("photo") MultipartFile photo,
                                                 Authentication auth) {
        User owner = resolveOwner(auth);
        FamilyMember member = familyMemberRepository.findByIdAndOwnerUserId(id, owner.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Family member not found: " + id));

        String contentType = photo.getContentType() != null ? photo.getContentType() : "image/jpeg";
        if (!List.of("image/jpeg", "image/png", "image/webp").contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Accepted types: image/jpeg, image/png, image/webp. Got: " + contentType);
        }
        if (photo.getSize() > 5 * 1024 * 1024L) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                "Photo must be ≤ 5 MB.");
        }

        byte[] bytes;
        try { bytes = photo.getBytes(); }
        catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Failed to read photo: " + e.getMessage());
        }

        String ext      = contentType.equals("image/png") ? ".png"
                        : contentType.equals("image/webp") ? ".webp" : ".jpg";
        String s3Key    = s3Service.uploadFile(
            "family-photos/" + owner.getId() + "/" + id,
            "profile" + ext,
            bytes,
            contentType);

        member.setPhotoS3Key(s3Key);
        familyMemberRepository.save(member);

        String photoUrl = s3Service.generatePresignedUrl(s3Key);
        return Map.of("s3Key", s3Key, "photoUrl", photoUrl);
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
