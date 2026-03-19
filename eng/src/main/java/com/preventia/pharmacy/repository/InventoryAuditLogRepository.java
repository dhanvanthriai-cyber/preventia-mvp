package com.preventia.pharmacy.repository;

import com.preventia.pharmacy.domain.InventoryAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryAuditLogRepository extends JpaRepository<InventoryAuditLog, Long> {
}
