package com.preventia.care.scheduler;

import com.preventia.care.domain.CarePlan;
import com.preventia.care.repository.CarePlanRepository;
import com.preventia.care.repository.CarePlanResponseRepository;
import com.preventia.care.service.CarePlanService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * CarePlanCheckinScheduler — runs every hour, sends due check-in messages.
 *
 * For each due active care plan:
 *   1. Send question to patient via Stream Chat
 *   2. Advance next_send_at by frequency
 *   3. If patient has not responded since last send → increment missed_count
 *   4. If missed_count >= 3 → alert doctor
 *
 * Sprint-10: CONSULT-007
 */
@Component
public class CarePlanCheckinScheduler {

    private static final Logger log = LoggerFactory.getLogger(CarePlanCheckinScheduler.class);

    private final CarePlanRepository         carePlanRepo;
    private final CarePlanResponseRepository responseRepo;
    private final CarePlanService            carePlanService;

    public CarePlanCheckinScheduler(CarePlanRepository carePlanRepo,
                                    CarePlanResponseRepository responseRepo,
                                    CarePlanService carePlanService) {
        this.carePlanRepo    = carePlanRepo;
        this.responseRepo    = responseRepo;
        this.carePlanService = carePlanService;
    }

    @Scheduled(cron = "0 0 * * * *") // every hour on the hour
    public void runCheckins() {
        Instant now = Instant.now();
        List<CarePlan> due = carePlanRepo.findDueForSending(now);

        if (due.isEmpty()) {
            log.debug("[CarePlanScheduler] No due check-ins.");
            return;
        }

        log.info("[CarePlanScheduler] Processing {} due check-in(s)", due.size());

        for (CarePlan plan : due) {
            // Check if patient responded since last send window
            boolean responded = !responseRepo
                .findByCarePlanIdOrderByRespondedAtDesc(plan.getId())
                .stream()
                .findFirst()
                .map(r -> r.getRespondedAt().isAfter(
                    CarePlanService.computeNextSendAt(plan.getFrequency(), now)
                        .minus(java.time.temporal.ChronoUnit.DAYS.getDuration()
                            .multipliedBy(frequencyDays(plan.getFrequency()) + 1))
                ))
                .orElse(false);

            if (!responded && plan.getMissedCount() > 0) {
                carePlanService.incrementMissed(plan);
            }

            carePlanService.sendCheckin(plan);
        }
    }

    private long frequencyDays(String frequency) {
        return switch (frequency == null ? "WEEKLY" : frequency.toUpperCase()) {
            case "DAILY"   -> 1L;
            case "MONTHLY" -> 30L;
            default        -> 7L;
        };
    }
}
