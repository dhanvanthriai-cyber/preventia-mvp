package com.preventia.consent.service;

import com.preventia.consent.domain.ConsentRecord;
import com.preventia.consent.dto.ConsentCheckResponse;
import com.preventia.consent.dto.ConsentRequest;
import com.preventia.consent.repository.ConsentRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business logic for the consent gate flow.
 *
 * A user must consent once per appointment before joining a teleconsultation.
 * Consent is stored in {@code consent_records} and checked on every join attempt.
 */
@Service
@Transactional
public class ConsentService {

    private final ConsentRecordRepository consentRecordRepository;

    public ConsentService(ConsentRecordRepository consentRecordRepository) {
        this.consentRecordRepository = consentRecordRepository;
    }

    /**
     * Check whether consent is required for the given user+appointment pair.
     *
     * @param userId        internal DB user ID
     * @param appointmentId appointment being joined
     * @return {@code required: true} if no prior consent exists
     */
    @Transactional(readOnly = true)
    public ConsentCheckResponse checkRequired(Long userId, Long appointmentId) {
        boolean alreadyConsented = consentRecordRepository
            .existsByUserIdAndAppointmentId(userId, appointmentId);
        return new ConsentCheckResponse(!alreadyConsented);
    }

    /**
     * Record consent for a user+appointment pair.
     *
     * @param userId    internal DB user ID of the consenting user
     * @param request   inbound consent payload
     * @param ipAddress client IP from the HTTP request
     */
    public void recordConsent(Long userId, ConsentRequest request, String ipAddress) {
        ConsentRecord record = new ConsentRecord(
            userId,
            request.appointmentId(),
            request.recordingConsent(),
            ipAddress,
            null   // user-agent captured at controller level if needed
        );
        consentRecordRepository.save(record);
    }
}
