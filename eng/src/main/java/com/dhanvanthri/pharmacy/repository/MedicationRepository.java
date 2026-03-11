package com.dhanvanthri.pharmacy.repository;

import com.dhanvanthri.pharmacy.domain.Medication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicationRepository extends JpaRepository<Medication, Long> {

    List<Medication> findByPatientId(Long patientId);

    /** Returns medications where days remaining <= threshold (default 7). */
    @Query("SELECT m FROM Medication m WHERE m.patientId = :patientId AND (m.totalQuantity / m.dailyDosage) <= :threshold")
    List<Medication> findLowStockByPatient(Long patientId, int threshold);
}
