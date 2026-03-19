package com.preventia.lab.repository;

import com.preventia.lab.domain.LabOrder;
import com.preventia.lab.domain.LabOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LabOrderRepository extends JpaRepository<LabOrder, Long> {

    /**
     * Find by external lab order ID — used for webhook matching.
     * Fired frequently; backed by {@code idx_lab_orders_external_order_id}.
     */
    Optional<LabOrder> findByExternalOrderId(String externalOrderId);

    /**
     * Find all orders for a patient with a specific status.
     * Used in patient dashboard and ops monitoring.
     */
    List<LabOrder> findByPatientIdAndStatus(Long patientId, LabOrderStatus status);

    /**
     * Find cold-chain orders in specified statuses.
     * Used by the cold chain monitoring scheduler to check temperature compliance.
     */
    List<LabOrder> findByRequiresColdChainTrueAndStatusIn(List<LabOrderStatus> statuses);
}
