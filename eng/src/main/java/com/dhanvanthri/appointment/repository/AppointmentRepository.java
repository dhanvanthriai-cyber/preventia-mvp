package com.dhanvanthri.appointment.repository;

import com.dhanvanthri.appointment.domain.Appointment;
import com.dhanvanthri.appointment.domain.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

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
}
