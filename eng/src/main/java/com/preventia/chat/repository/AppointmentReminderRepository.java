package com.preventia.chat.repository;

import com.preventia.chat.domain.AppointmentReminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AppointmentReminderRepository extends JpaRepository<AppointmentReminder, Long> {

    boolean existsByAppointmentIdAndReminderType(Long appointmentId, String reminderType);
}
