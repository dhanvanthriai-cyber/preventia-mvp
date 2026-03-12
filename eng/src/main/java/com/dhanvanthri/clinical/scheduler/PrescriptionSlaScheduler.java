package com.dhanvanthri.clinical.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Monitors prescription SLA compliance and escalates breaches.
 *
 * Per PRESCRIPTION_WORKFLOW.md: verification must occur within 4 hours of upload.
 * Runs every 30 minutes; on breach writes SLA_BREACH_ESCALATED to audit log.
 */
@Component
public class PrescriptionSlaScheduler {

    private static final Logger log = LoggerFactory.getLogger(PrescriptionSlaScheduler.class);

    private final JdbcTemplate jdbc;

    public PrescriptionSlaScheduler(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Scheduled(cron = "0 0/30 * * * *")
    public void checkSlaBreaches() {
        log.debug("[PrescriptionSLA] Running SLA check...");

        List<Map<String, Object>> breached = jdbc.queryForList("""
            SELECT sn.id AS soap_note_id, sn.prescription_uploaded_at,
                   NOW() - sn.prescription_uploaded_at AS age
            FROM soap_notes sn
            WHERE sn.prescription_status = 'PENDING_VERIFICATION'
              AND sn.prescription_uploaded_at IS NOT NULL
              AND NOW() - sn.prescription_uploaded_at > INTERVAL '4 hours'
              AND NOT EXISTS (
                  SELECT 1 FROM prescription_audit_log pal
                  WHERE pal.soap_note_id = sn.id
                    AND pal.action = 'SLA_BREACH_ESCALATED'
              )
            ORDER BY sn.prescription_uploaded_at ASC
            """);

        if (breached.isEmpty()) { log.debug("[PrescriptionSLA] No breaches."); return; }

        log.warn("[PrescriptionSLA] ⚠️ {} SLA breach(es) detected", breached.size());

        for (Map<String, Object> row : breached) {
            long id = ((Number) row.get("soap_note_id")).longValue();
            log.warn("[PrescriptionSLA] BREACH soap_note_id={} age={}", id, row.get("age"));
            try {
                jdbc.update("""
                    INSERT INTO prescription_audit_log
                        (soap_note_id, actor_id, action, reason, metadata, created_at)
                    VALUES (?, NULL, 'SLA_BREACH_ESCALATED',
                            'No pharmacist action within 4 hours.',
                            '{"sla_hours":4,"source":"PrescriptionSlaScheduler"}'::jsonb,
                            NOW())
                    """, id);
            } catch (Exception e) {
                log.error("[PrescriptionSLA] Audit insert failed for id={}: {}", id, e.getMessage());
            }
        }
        // TODO Phase 4: emit push/email notification to @ops + Doctor + Sponsor
    }
}
