package com.preventia.ops.repository;

import com.preventia.ops.domain.ConsultationFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConsultationFeedbackRepository extends JpaRepository<ConsultationFeedback, Long> {
    Optional<ConsultationFeedback> findByAppointmentIdAndUserId(Long appointmentId, Long userId);
    boolean existsByAppointmentIdAndUserId(Long appointmentId, Long userId);
}
