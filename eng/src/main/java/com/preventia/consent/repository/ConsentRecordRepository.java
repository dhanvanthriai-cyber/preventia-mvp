package com.preventia.consent.repository;

import com.preventia.consent.domain.ConsentRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Data access for {@link ConsentRecord} entities.
 */
@Repository
public interface ConsentRecordRepository extends JpaRepository<ConsentRecord, Long> {

    /**
     * Check whether a consent record exists for a given user+appointment pair.
     * Used to skip the consent gate if the user already consented.
     */
    boolean existsByUserIdAndAppointmentId(Long userId, Long appointmentId);
}
