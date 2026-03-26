package com.preventia.care.service;

import com.preventia.care.domain.CarePlan;
import com.preventia.care.dto.CarePlanRequest;
import com.preventia.care.dto.CarePlanResponse;
import com.preventia.care.repository.CarePlanRepository;
import com.preventia.care.repository.CarePlanResponseRepository;
import com.preventia.chat.service.ChatNotificationService;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

/**
 * CarePlanService — business logic for recurring patient check-in questions.
 *
 * Sprint-10: CONSULT-007
 */
@Service
@Transactional
public class CarePlanService {

    private static final Logger log = LoggerFactory.getLogger(CarePlanService.class);
    private static final int MISSED_ALERT_THRESHOLD = 3;

    private final CarePlanRepository         carePlanRepo;
    private final CarePlanResponseRepository responseRepo;
    private final ChatNotificationService    chatNotificationService;

    public CarePlanService(CarePlanRepository carePlanRepo,
                           CarePlanResponseRepository responseRepo,
                           ChatNotificationService chatNotificationService) {
        this.carePlanRepo           = carePlanRepo;
        this.responseRepo           = responseRepo;
        this.chatNotificationService = chatNotificationService;
    }

    /** Doctor creates a new care plan for a patient. */
    public CarePlanResponse create(Long doctorId, CarePlanRequest req) {
        Instant firstSend = computeNextSendAt(req.frequency(), Instant.now());
        CarePlan plan = new CarePlan(
            req.patientId(), doctorId, req.appointmentId(),
            req.question(), req.frequency(), firstSend
        );
        return CarePlanResponse.from(carePlanRepo.save(plan));
    }

    /** Fetch all active care plans for a patient (doctor view). */
    @Transactional(readOnly = true)
    public List<CarePlanResponse> getByPatient(Long doctorId, Long patientId) {
        return carePlanRepo.findByDoctorIdAndPatientId(doctorId, patientId)
            .stream().map(CarePlanResponse::from).collect(Collectors.toList());
    }

    /** Deactivate a care plan. */
    public void deactivate(Long planId, Long doctorId) {
        CarePlan plan = carePlanRepo.findById(planId)
            .orElseThrow(() -> new EntityNotFoundException("CarePlan not found: " + planId));
        if (!plan.getDoctorId().equals(doctorId)) {
            throw new IllegalStateException("Not authorised to deactivate plan " + planId);
        }
        plan.setActive(false);
        carePlanRepo.save(plan);
    }

    /**
     * Called by CarePlanCheckinScheduler for each due plan.
     * Sends the check-in message and advances next_send_at.
     */
    public void sendCheckin(CarePlan plan) {
        try {
            chatNotificationService.sendCarePlanCheckin(
                plan.getDoctorId(), plan.getPatientId(),
                plan.getId(), plan.getQuestion()
            );
            plan.setNextSendAt(computeNextSendAt(plan.getFrequency(), Instant.now()));
            carePlanRepo.save(plan);
            log.info("[CarePlan] Check-in sent: planId={} patient={}", plan.getId(), plan.getPatientId());
        } catch (Exception e) {
            log.warn("[CarePlan] Failed to send check-in for plan={}: {}", plan.getId(), e.getMessage());
        }
    }

    /**
     * Called when a patient responds to a check-in message (via Stream webhook or manual API).
     * Resets the missed count.
     */
    public void recordResponse(Long planId, String responseText, String streamMessageId) {
        CarePlan plan = carePlanRepo.findById(planId)
            .orElseThrow(() -> new EntityNotFoundException("CarePlan not found: " + planId));
        responseRepo.save(new com.preventia.care.domain.CarePlanResponse(planId, responseText, streamMessageId));
        plan.setMissedCount(0);
        carePlanRepo.save(plan);
    }

    /**
     * Increments missed count. If threshold reached, alert the doctor.
     */
    public void incrementMissed(CarePlan plan) {
        int newCount = plan.getMissedCount() + 1;
        plan.setMissedCount(newCount);
        carePlanRepo.save(plan);

        if (newCount >= MISSED_ALERT_THRESHOLD) {
            log.warn("[CarePlan] ⚠️ {} missed check-ins for patient={} plan={}",
                newCount, plan.getPatientId(), plan.getId());
            chatNotificationService.sendMissedCheckinAlert(
                plan.getDoctorId(), plan.getPatientId(),
                plan.getId(), newCount, plan.getQuestion()
            );
        }
    }

    // -------------------------------------------------------------------------

    public static Instant computeNextSendAt(String frequency, Instant from) {
        return switch (frequency == null ? "WEEKLY" : frequency.toUpperCase()) {
            case "DAILY"   -> from.plus(1,  ChronoUnit.DAYS);
            case "MONTHLY" -> from.plus(30, ChronoUnit.DAYS);
            default        -> from.plus(7,  ChronoUnit.DAYS); // WEEKLY
        };
    }
}
