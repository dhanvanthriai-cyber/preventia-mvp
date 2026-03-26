package com.preventia.care.repository;

import com.preventia.care.domain.CarePlanResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CarePlanResponseRepository extends JpaRepository<CarePlanResponse, Long> {
    List<CarePlanResponse> findByCarePlanIdOrderByRespondedAtDesc(Long carePlanId);
}
