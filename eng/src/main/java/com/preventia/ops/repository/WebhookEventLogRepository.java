package com.preventia.ops.repository;

import com.preventia.ops.domain.WebhookEventLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WebhookEventLogRepository extends JpaRepository<WebhookEventLog, Long> {
}
