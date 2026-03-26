package com.preventia.insights.repository;

import com.preventia.insights.domain.LifestyleInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LifestyleInsightRepository extends JpaRepository<LifestyleInsight, Long> {

    /** All insights by a specific doctor, newest first. */
    List<LifestyleInsight> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);

    /**
     * All insights from a set of doctors (used for patient feed).
     * Returns newest-first across all specified doctors.
     */
    @Query("SELECT li FROM LifestyleInsight li WHERE li.doctorId IN :doctorIds ORDER BY li.createdAt DESC")
    List<LifestyleInsight> findByDoctorIdInOrderByCreatedAtDesc(@Param("doctorIds") List<Long> doctorIds);
}
