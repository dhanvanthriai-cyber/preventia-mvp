package com.dhanvanthri.family.repository;

import com.dhanvanthri.family.domain.FamilyRelationship;
import com.dhanvanthri.family.domain.FamilyRelationship.ConsentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FamilyRelationshipRepository extends JpaRepository<FamilyRelationship, Long> {

    List<FamilyRelationship> findBySponsorId(Long sponsorId);

    List<FamilyRelationship> findByRecipientId(Long recipientId);

    Optional<FamilyRelationship> findBySponsorIdAndRecipientId(Long sponsorId, Long recipientId);

    List<FamilyRelationship> findBySponsorIdAndConsentStatus(Long sponsorId, ConsentStatus status);
}
