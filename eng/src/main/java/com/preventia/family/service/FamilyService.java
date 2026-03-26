package com.preventia.family.service;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.chat.service.ChatNotificationService;
import com.preventia.family.domain.FamilyRelationship;
import com.preventia.family.domain.FamilyRelationship.ConsentStatus;
import com.preventia.family.domain.User;
import com.preventia.family.dto.FamilyLinkRequest;
import com.preventia.family.dto.FamilyLinkResponse;
import com.preventia.family.repository.FamilyRelationshipRepository;
import com.preventia.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional
public class FamilyService {

    private static final Logger log = LoggerFactory.getLogger(FamilyService.class);

    private final FamilyRelationshipRepository relationshipRepo;
    private final UserRepository userRepo;
    private final AppointmentRepository appointmentRepo;
    private final ChatNotificationService chatNotificationService;

    public FamilyService(FamilyRelationshipRepository relationshipRepo,
                         UserRepository userRepo,
                         AppointmentRepository appointmentRepo,
                         ChatNotificationService chatNotificationService) {
        this.relationshipRepo        = relationshipRepo;
        this.userRepo                = userRepo;
        this.appointmentRepo         = appointmentRepo;
        this.chatNotificationService = chatNotificationService;
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
     * CHAT-006: Also creates the sponsor-doctor update channel in Stream Chat.
     */
    public FamilyLinkResponse grantConsent(Long relationshipId) {
        FamilyRelationship rel = relationshipRepo.findById(relationshipId)
            .orElseThrow(() -> new IllegalArgumentException("Relationship not found: " + relationshipId));

        rel.setConsentStatus(ConsentStatus.GRANTED);
        rel.setGrantedAt(Instant.now());
        FamilyLinkResponse response = toResponse(relationshipRepo.save(rel));

        // CHAT-006: Create sponsor-doctor channel on consent GRANTED
        // Find the patient's most recent appointment to get the doctor
        Long sponsorId    = rel.getSponsor().getId();
        Long recipientId  = rel.getRecipient().getId();
        String sponsorName = rel.getSponsor().getName();
        String patientName = rel.getRecipient().getName();

        appointmentRepo.findTopByRecipientIdOrderByStartTimeDesc(recipientId).ifPresent(appt -> {
            Long doctorId = appt.getDoctorId();
            userRepo.findById(doctorId).ifPresent(doctor -> {
                try {
                    // SPRINT-08 CHAT-006: 1:1 sponsor-doctor channel
                    chatNotificationService.createSponsorDoctorChannel(
                        sponsorId, doctorId, sponsorName, doctor.getName(), patientName
                    );
                    log.info("[FamilyService] Sponsor-doctor channel created: sponsor={} doctor={}", sponsorId, doctorId);

                    // SPRINT-10 CHAT-014: 3-way care team channel (doctor + patient + sponsor)
                    chatNotificationService.createCareTeamChannel(
                        sponsorId, recipientId, doctorId,
                        sponsorName, patientName, doctor.getName()
                    );
                    log.info("[FamilyService] Care team channel created: patient={}", recipientId);
                } catch (Exception e) {
                    log.warn("[FamilyService] Failed to create channels on consent GRANTED: {}", e.getMessage());
                }
            });
        });

        return response;
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
