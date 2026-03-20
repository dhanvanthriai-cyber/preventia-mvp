package com.preventia.family.repository;

import com.preventia.family.domain.FamilyMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, Long> {

    /** All members owned by this RECIPIENT, oldest first. */
    List<FamilyMember> findByOwnerUserIdOrderByCreatedAtAsc(Long ownerUserId);

    /** Ownership-scoped single-member lookup — prevents cross-user data access. */
    Optional<FamilyMember> findByIdAndOwnerUserId(Long id, Long ownerUserId);
}
