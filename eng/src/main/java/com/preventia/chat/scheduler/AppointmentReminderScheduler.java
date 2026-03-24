package com.preventia.chat.scheduler;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.auth.repository.UserRepository;
import com.preventia.chat.domain.AppointmentReminder;
import com.preventia.chat.repository.AppointmentReminderRepository;
import com.preventia.chat.service.ChatNotificationService;
import com.preventia.family.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * AppointmentReminderScheduler — CHAT-003
 *
 * Runs every 15 minutes. Sends pre-consultation reminder messages at T-24h and T-1h
 * to the patient's Stream Chat channel. Uses appointment_reminders table as a
 * deduplication guard to ensure each reminder is sent exactly once.
 *
 * Skips appointments with status CANCELLED, COMPLETED, or LOCKED.
 */
@Component
public class AppointmentReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(AppointmentReminderScheduler.class);

    private static final DateTimeFormatter IST_FMT =
        DateTimeFormatter.ofPattern("hh:mm a").withZone(ZoneId.of("Asia/Kolkata"));

    private final AppointmentRepository       appointmentRepository;
    private final AppointmentReminderRepository reminderRepository;
    private final ChatNotificationService     chatNotificationService;
    private final UserRepository              userRepository;

    @Value("${app.portal-url:https://app.preventia.ai}")
    private String portalUrl;

    public AppointmentReminderScheduler(
            AppointmentRepository appointmentRepository,
            AppointmentReminderRepository reminderRepository,
            ChatNotificationService chatNotificationService,
            UserRepository userRepository) {
        this.appointmentRepository  = appointmentRepository;
        this.reminderRepository     = reminderRepository;
        this.chatNotificationService = chatNotificationService;
        this.userRepository         = userRepository;
    }

    /**
     * Runs every 15 minutes.
     * Checks for appointments in T-23h..T-25h window (24h reminder)
     * and T-45min..T-75min window (1h reminder).
     */
    @Scheduled(fixedDelay = 15 * 60 * 1000)
    public void sendReminders() {
        OffsetDateTime now = OffsetDateTime.now();

        // 24h window: start_time between now+23h and now+25h
        List<Appointment> upcoming24h = appointmentRepository.findUpcomingInWindow(
            now.plusHours(23), now.plusHours(25)
        );
        for (Appointment appt : upcoming24h) {
            sendReminderIfNotSent(appt, "24H");
        }

        // 1h window: start_time between now+45min and now+75min
        List<Appointment> upcoming1h = appointmentRepository.findUpcomingInWindow(
            now.plusMinutes(45), now.plusMinutes(75)
        );
        for (Appointment appt : upcoming1h) {
            sendReminderIfNotSent(appt, "1H");
        }
    }

    private void sendReminderIfNotSent(Appointment appt, String reminderType) {
        if (reminderRepository.existsByAppointmentIdAndReminderType(appt.getId(), reminderType)) {
            log.debug("[ReminderScheduler] Already sent {} reminder for apptId={}", reminderType, appt.getId());
            return;
        }

        String doctorName = userRepository.findById(appt.getDoctorId())
            .map(User::getName).orElse("your doctor");

        String istTime = IST_FMT.format(appt.getStartTime());

        String messageText;
        if ("24H".equals(reminderType)) {
            messageText = String.format(
                "⏰ Reminder: Your consultation with Dr. %s is tomorrow at %s IST.\n" +
                "Please have your medications list and any recent lab reports ready.",
                doctorName, istTime
            );
        } else {
            messageText = String.format(
                "🔔 Your consultation starts in 1 hour.\n" +
                "Dr. %s will be ready at %s IST.\n" +
                "Join here: %s/patient/consult/%d",
                doctorName, istTime, portalUrl, appt.getId()
            );
        }

        try {
            chatNotificationService.sendSystemMessage(
                appt.getDoctorId(), appt.getRecipientId(), messageText
            );

            // Record the reminder to prevent double-send
            reminderRepository.save(new AppointmentReminder(appt.getId(), reminderType));
            log.info("[ReminderScheduler] Sent {} reminder for apptId={}", reminderType, appt.getId());

            // Also notify sponsor channel if present
            if (appt.getSponsorId() != null) {
                chatNotificationService.sendSponsorChannelMessage(
                    appt.getSponsorId(), appt.getDoctorId(), messageText
                );
            }
        } catch (Exception e) {
            log.warn("[ReminderScheduler] Failed to send {} reminder for apptId={}: {}",
                reminderType, appt.getId(), e.getMessage());
        }
    }
}
