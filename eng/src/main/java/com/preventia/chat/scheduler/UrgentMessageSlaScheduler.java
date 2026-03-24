package com.preventia.chat.scheduler;

import com.preventia.chat.domain.UrgentMessageAlert;
import com.preventia.chat.repository.UrgentMessageAlertRepository;
import com.preventia.shared.service.MailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * UrgentMessageSlaScheduler — CHAT-005
 *
 * Runs every 30 minutes. Finds urgent messages tracked in urgent_message_alerts
 * that are older than 4 hours with no reply (alertSentAt == null),
 * then sends an admin email alert.
 *
 * Urgent messages are registered via the Stream webhook (StreamWebhookController)
 * when a message.new event arrives with extraData.urgent = true.
 */
@Component
public class UrgentMessageSlaScheduler {

    private static final Logger log = LoggerFactory.getLogger(UrgentMessageSlaScheduler.class);
    private static final int SLA_HOURS = 4;

    private final UrgentMessageAlertRepository alertRepository;
    private final MailService                  mailService;

    public UrgentMessageSlaScheduler(UrgentMessageAlertRepository alertRepository,
                                     MailService mailService) {
        this.alertRepository = alertRepository;
        this.mailService     = mailService;
    }

    /**
     * Runs every 30 minutes. Checks for urgent messages > 4h old without admin alert.
     */
    @Scheduled(fixedDelay = 30 * 60 * 1000)
    public void checkSlaBreaches() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusHours(SLA_HOURS);

        List<UrgentMessageAlert> breaches = alertRepository.findUnalertedOlderThan(cutoff);

        if (breaches.isEmpty()) {
            log.debug("[UrgentSlaScheduler] No SLA breaches found.");
            return;
        }

        log.warn("[UrgentSlaScheduler] {} urgent message(s) breached 4h SLA — alerting admin.", breaches.size());

        for (UrgentMessageAlert alert : breaches) {
            try {
                String subject = "Urgent Message SLA Breach — Channel " + alert.getChannelId();
                String body = String.format(
                    "An urgent patient message has not received a response within 4 hours.\n\n" +
                    "Channel ID : %s\n" +
                    "Message ID : %s\n" +
                    "Sent at    : %s\n\n" +
                    "Please review the channel immediately.",
                    alert.getChannelId(), alert.getMessageId(), alert.getSentAt()
                );

                mailService.sendAdminAlert(subject, body);

                // Mark as alerted
                alert.setAlertSentAt(OffsetDateTime.now());
                alertRepository.save(alert);

                log.info("[UrgentSlaScheduler] Admin alerted for message {} in channel {}",
                    alert.getMessageId(), alert.getChannelId());
            } catch (Exception e) {
                log.error("[UrgentSlaScheduler] Failed to process SLA breach for messageId={}: {}",
                    alert.getMessageId(), e.getMessage());
            }
        }
    }
}
