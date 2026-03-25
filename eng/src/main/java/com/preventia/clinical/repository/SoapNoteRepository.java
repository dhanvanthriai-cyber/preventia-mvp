package com.preventia.clinical.repository;

import com.preventia.clinical.domain.SoapNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SoapNoteRepository extends JpaRepository<SoapNote, Long> {
    List<SoapNote> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<SoapNote> findByDoctorIdAndPatientId(Long doctorId, Long patientId);
    List<SoapNote> findByAppointmentId(Long appointmentId);
}
