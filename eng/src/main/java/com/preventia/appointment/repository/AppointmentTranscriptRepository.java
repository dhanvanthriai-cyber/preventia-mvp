package com.preventia.appointment.repository;

import com.preventia.appointment.domain.AppointmentTranscript;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppointmentTranscriptRepository extends JpaRepository<AppointmentTranscript, Long> {
    List<AppointmentTranscript> findByAppointmentId(Long appointmentId);
}
