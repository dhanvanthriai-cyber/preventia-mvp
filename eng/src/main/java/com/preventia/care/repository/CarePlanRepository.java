package com.preventia.care.repository;

import com.preventia.care.domain.CarePlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface CarePlanRepository extends JpaRepository<CarePlan, Long> {

    List<CarePlan> findByPatientIdAndActiveTrue(Long patientId);

    List<CarePlan> findByDoctorIdAndPatientId(Long doctorId, Long patientId);

    /** All active plans due for sending (scheduler query). */
    @Query("SELECT cp FROM CarePlan cp WHERE cp.active = true AND cp.nextSendAt <= :now")
    List<CarePlan> findDueForSending(@Param("now") Instant now);
}
