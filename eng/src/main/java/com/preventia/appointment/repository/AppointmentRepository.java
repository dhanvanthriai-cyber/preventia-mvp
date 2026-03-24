package com.preventia.appointment.repository;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.domain.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Data access layer for {@link Appointment} entities.
 *
 * Spring Data JPA derives all queries from method names — no JPQL needed.
 */
@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    /**
     * Look up an appointment by its Daily.co room name.
     * Used to correlate incoming Daily.co webhook events to the correct record.
     *
     * @param roomName the Daily.co short room identifier
     * @return the matching appointment, if one exists
     */
    Optional<Appointment> findByDailyRoomName(String roomName);

    /**
     * Fetch all appointments for a given patient in a specific lifecycle state.
     * Useful for "show active session" and history views.
     */
    List<Appointment> findByRecipientIdAndStatus(Long recipientId, AppointmentStatus status);

    /**
     * Fetch all appointments for a given doctor in a specific lifecycle state.
     * Powers the doctor's schedule / active-queue dashboard.
     */
    List<Appointment> findByDoctorIdAndStatus(Long doctorId, AppointmentStatus status);

    /** All appointments for a doctor regardless of status. */
    List<Appointment> findByDoctorId(Long doctorId);

    /** All appointments for a sponsor regardless of status. */
    List<Appointment> findBySponsorId(Long sponsorId);

    /** All appointments for a recipient regardless of status. */
    List<Appointment> findByRecipientId(Long recipientId);

    /**
     * Most recent appointment for a patient (for chat peer resolution).
     * Spring Data derives: ORDER BY start_time DESC LIMIT 1
     */
    Optional<Appointment> findTopByRecipientIdOrderByStartTimeDesc(Long recipientId);

    /**
     * All appointments in a given lifecycle state (used by ZombieRoomScheduler).
     */
    List<Appointment> findByStatus(AppointmentStatus status);

    /**
     * All ACTIVE appointments whose end_time is before the given cutoff.
     * Used by ZombieRoomScheduler to detect stale rooms.
     */
    List<Appointment> findByStatusAndEndTimeBefore(AppointmentStatus status, java.time.OffsetDateTime cutoff);

    /**
     * Appointments whose start_time is between windowStart and windowEnd,
     * in a non-terminal status — used by the reminder scheduler.
     */
    @Query("SELECT a FROM Appointment a WHERE a.startTime BETWEEN :windowStart AND :windowEnd " +
           "AND a.status NOT IN ('CANCELLED', 'COMPLETED', 'LOCKED')")
    List<Appointment> findUpcomingInWindow(
        @Param("windowStart") OffsetDateTime windowStart,
        @Param("windowEnd") OffsetDateTime windowEnd
    );

    /**
     * Appointments with status = SCHEDULED whose start_time is in the past by more than
     * the given offset — used by NoShowScheduler to find potentially missed appointments.
     */
    @Query("SELECT a FROM Appointment a WHERE a.status = 'SCHEDULED' AND a.startTime < :cutoff")
    List<Appointment> findScheduledStartedBefore(@Param("cutoff") OffsetDateTime cutoff);
}
