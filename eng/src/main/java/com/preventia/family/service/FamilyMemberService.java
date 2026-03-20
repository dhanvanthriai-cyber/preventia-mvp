package com.preventia.family.service;

import com.preventia.family.domain.FamilyMember;
import com.preventia.family.dto.AddFamilyMemberRequest;
import com.preventia.family.dto.FamilyMemberResponse;
import com.preventia.family.repository.FamilyMemberRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
@Transactional
public class FamilyMemberService {

    private final FamilyMemberRepository memberRepo;

    public FamilyMemberService(FamilyMemberRepository memberRepo) {
        this.memberRepo = memberRepo;
    }

    @Transactional(readOnly = true)
    public List<FamilyMemberResponse> getMembers(Long ownerUserId) {
        return memberRepo.findByOwnerUserIdOrderByCreatedAtAsc(ownerUserId)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public FamilyMemberResponse addMember(Long ownerUserId, AddFamilyMemberRequest req) {
        FamilyMember m = new FamilyMember();
        m.setOwnerUserId(ownerUserId);
        m.setFirstName(req.firstName().strip());
        m.setLastName(req.lastName().strip());
        m.setPhone(req.phone());
        m.setEmail(req.email());
        m.setAddress(req.address());
        m.setRelationship(req.relationship());

        if (req.dateOfBirth() != null && !req.dateOfBirth().isBlank()) {
            try {
                m.setDateOfBirth(LocalDate.parse(req.dateOfBirth()));
            } catch (DateTimeParseException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "dateOfBirth must be YYYY-MM-DD. Received: " + req.dateOfBirth());
            }
        }

        return toResponse(memberRepo.save(m));
    }

    public void deleteMember(Long ownerUserId, Long memberId) {
        FamilyMember m = memberRepo.findByIdAndOwnerUserId(memberId, ownerUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Family member not found or not owned by current user: " + memberId));
        memberRepo.delete(m);
    }

    // ── Mapping ──────────────────────────────────────────────────────────────

    private FamilyMemberResponse toResponse(FamilyMember m) {
        String fullName = m.getFirstName() + " " + m.getLastName();
        return new FamilyMemberResponse(
            m.getId(),
            m.getFirstName(),
            m.getLastName(),
            fullName,
            initials(m.getFirstName(), m.getLastName()),
            m.getDateOfBirth() != null ? m.getDateOfBirth().toString() : null,
            m.getPhone(),
            m.getEmail(),
            m.getAddress(),
            m.getRelationship().name(),
            null,   // photoUrl — separate upload endpoint, not included here
            m.getCareStatus().name(),
            m.getCreatedAt().toString()
        );
    }

    private static String initials(String first, String last) {
        String f = (first != null && !first.isBlank()) ? first.substring(0, 1).toUpperCase() : "?";
        String l = (last  != null && !last.isBlank())  ? last.substring(0, 1).toUpperCase()  : "?";
        return f + l;
    }
}
