package com.preventia.appointment.scheduler;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.domain.AppointmentStatus;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.appointment.service.AppointmentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * ZombieRoomScheduler — auto-terminates Daily.co rooms that stayed ACTIVE
 * past their scheduled end time + grace period.
 *
 * Scenario: both participants crash or drop without triggering a formal
 * leave() call, so the Daily.co meeting-ended webhook never fires.
 * The appointment stays ACTIVE indefinitely, keeping EMR write-access open.
 *
 * Fix: every 5 minutes, query all ACTIVE appointments whose end_time is
 * older than ZOMBIE_THRESHOLD_MINUTES minutes ago and force-complete + lock them.
 */
@Component
public class ZombieRoomScheduler {

    private static final Logger log = LoggerFactory.getLogger(ZombieRoomScheduler.class);

    /** Grace period after scheduled end_time before we auto-terminate. */
    private static final int ZOMBIE_THRESHOLD_MINUTES = 15;

    private final AppointmentRepository appointmentRepository;
    private final AppointmentService    appointmentService;

    public ZombieRoomScheduler(AppointmentRepository appointmentRepository,
                               AppointmentService appointmentService) {
        this.appointmentRepository = appointmentRepository;
        this.appointmentService    = appointmentService;
    }

    /**
     * Runs every 5 minutes. Finds stale ACTIVE rooms and locks them.
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000)
    public void terminateZombieRooms() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(ZOMBIE_THRESHOLD_MINUTES);

        List<Appointment> zombies = appointmentRepository
            .findByStatusAndEndTimeBefore(AppointmentStatus.ACTIVE, cutoff);

        if (zombies.isEmpty()) {
            log.debug("[ZombieRoomScheduler] No zombie rooms found.");
            return;
        }

        log.info("[ZombieRoomScheduler] Found {} zombie room(s) to auto-terminate.", zombies.size());

        for (Appointment appt : zombies) {
            try {
                log.warn("[ZombieRoomScheduler] Auto-ending zombie room: apptId={} room={} endTime={}",
                    appt.getId(), appt.getDailyRoomName(), appt.getEndTime());

                appointmentService.completeAppointment(appt.getId());
                appointmentService.lockAppointment(appt.getId());

                log.info("[ZombieRoomScheduler] Successfully locked zombie room for apptId={}", appt.getId());
            } catch (Exception e) {
                log.error("[ZombieRoomScheduler] Failed to auto-terminate apptId={} room={}: {}",
                    appt.getId(), appt.getDailyRoomName(), e.getMessage(), e);
            }
        }
    }
}
