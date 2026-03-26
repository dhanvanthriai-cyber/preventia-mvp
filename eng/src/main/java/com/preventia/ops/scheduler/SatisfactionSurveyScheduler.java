package com.preventia.ops.scheduler;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.domain.AppointmentStatus;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.auth.repository.UserRepository;
import com.preventia.chat.service.ChatNotificationService;
import com.preventia.ops.repository.ConsultationFeedbackRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * SatisfactionSurveyScheduler — sends post-consultation satisfaction surveys.
 *
 * Runs every 10 minutes. Finds appointments that LOCKED 30+ minutes ago
 * and have not yet received a survey. Sends once per patient per appointment.
 *
 * Sprint-10: CONSULT-009
 */
@Component
public class SatisfactionSurveyScheduler {

    private static final Logger log = LoggerFactory.getLogger(SatisfactionSurveyScheduler.class);
    private static final int    SURVEY_DELAY_MINUTES = 30;

    private final AppointmentRepository         appointmentRepository;
    private final ConsultationFeedbackRepository feedbackRepository;
    private final ChatNotificationService        chatNotificationService;
    private final UserRepository                 userRepository;

    public SatisfactionSurveyScheduler(AppointmentRepository appointmentRepository,
                                        ConsultationFeedbackRepository feedbackRepository,
                                        ChatNotificationService chatNotificationService,
                                        UserRepository userRepository) {
        this.appointmentRepository = appointmentRepository;
        this.feedbackRepository    = feedbackRepository;
        this.chatNotificationService = chatNotificationService;
        this.userRepository          = userRepository;
    }

    @Scheduled(cron = "0 0/10 * * * *") // every 10 minutes
    public void sendPendingSurveys() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(SURVEY_DELAY_MINUTES);

        // Find all LOCKED appointments whose end time was before the cutoff
        List<Appointment> candidates = appointmentRepository.findByStatus(AppointmentStatus.LOCKED)
            .stream()
            .filter(a -> a.getEndTime() != null && a.getEndTime().isBefore(cutoff))
            .toList();

        if (candidates.isEmpty()) {
            log.debug("[SurveyScheduler] No pending surveys.");
            return;
        }

        log.info("[SurveyScheduler] Checking {} LOCKED appointments for surveys", candidates.size());

        int sent = 0;
        for (Appointment appt : candidates) {
            // Skip if patient already submitted feedback
            if (feedbackRepository.existsByAppointmentIdAndUserId(appt.getId(), appt.getRecipientId())) {
                continue;
            }

            String doctorName = userRepository.findById(appt.getDoctorId())
                .map(u -> u.getName())
                .orElse("your doctor");

            try {
                chatNotificationService.sendSatisfactionSurvey(
                    appt.getDoctorId(), appt.getRecipientId(),
                    appt.getId(), doctorName
                );
                sent++;
            } catch (Exception e) {
                log.warn("[SurveyScheduler] Failed to send survey for appt={}: {}", appt.getId(), e.getMessage());
            }
        }

        if (sent > 0) log.info("[SurveyScheduler] Sent {} survey(s)", sent);
    }
}
