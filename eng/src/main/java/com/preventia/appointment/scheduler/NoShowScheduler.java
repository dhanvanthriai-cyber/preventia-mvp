package com.preventia.appointment.scheduler;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.auth.repository.UserRepository;
import com.preventia.chat.service.ChatNotificationService;
import com.preventia.family.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * NoShowScheduler — CHAT-011
 *
 * Runs every 5 minutes. Finds appointments with status=SCHEDULED where
 * start_time < now()-10min. For each, checks the Daily.co room participant
 * list to detect if the doctor has not joined (patient joined but doctor absent).
 *
 * Sends the appropriate no-show message via Stream Chat.
 *
 * CHAT-010 (patient no-show) is triggered from DailyWebhookController
 * on meeting-ended when the patient's participant ID was never seen.
 */
@Component
public class NoShowScheduler {

    private static final Logger log = LoggerFactory.getLogger(NoShowScheduler.class);
    private static final int NO_SHOW_GRACE_MINUTES = 10;
    private static final DateTimeFormatter DATE_FMT =
        DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a").withZone(ZoneId.of("Asia/Kolkata"));

    private final AppointmentRepository   appointmentRepository;
    private final ChatNotificationService chatNotificationService;
    private final UserRepository          userRepository;
    private final RestClient              dailyRestClient;

    @Value("${app.clinic-phone:+91-80-1234-5678}")
    private String clinicPhone;

    public NoShowScheduler(AppointmentRepository appointmentRepository,
                           ChatNotificationService chatNotificationService,
                           UserRepository userRepository,
                           @Value("${daily.api-key:STUB_KEY}") String dailyApiKey) {
        this.appointmentRepository   = appointmentRepository;
        this.chatNotificationService = chatNotificationService;
        this.userRepository          = userRepository;
        this.dailyRestClient = RestClient.builder()
            .baseUrl("https://api.daily.co/v1")
            .defaultHeader("Authorization", "Bearer " + dailyApiKey)
            .build();
    }

    /**
     * Every 5 minutes — check for doctor no-shows (CHAT-011).
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000)
    public void checkDoctorNoShows() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(NO_SHOW_GRACE_MINUTES);

        List<Appointment> candidates = appointmentRepository.findScheduledStartedBefore(cutoff);

        for (Appointment appt : candidates) {
            try {
                checkAndNotifyDoctorNoShow(appt);
            } catch (Exception e) {
                log.warn("[NoShowScheduler] Error checking apptId={}: {}", appt.getId(), e.getMessage());
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void checkAndNotifyDoctorNoShow(Appointment appt) {
        if (appt.getDailyRoomName() == null || appt.getDailyRoomName().startsWith("pending")) {
            return; // Room not provisioned
        }

        boolean patientJoined = false;
        boolean doctorJoined  = false;

        try {
            // Call Daily.co rooms API to get participant presence
            Map<String, Object> room = dailyRestClient.get()
                .uri("/rooms/" + appt.getDailyRoomName())
                .retrieve()
                .body(Map.class);

            if (room != null) {
                Object participants = room.get("participants");
                if (participants instanceof List<?> pList) {
                    for (Object p : pList) {
                        if (p instanceof Map<?, ?> participant) {
                            String userId = String.valueOf(((Map<String, Object>) participant).getOrDefault("user_id", ""));
                            if (userId.equals(String.valueOf(appt.getRecipientId()))) patientJoined = true;
                            if (userId.equals(String.valueOf(appt.getDoctorId())))    doctorJoined  = true;
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.debug("[NoShowScheduler] Daily.co API unavailable (stub): {}", e.getMessage());
            // In stub mode, skip the actual check
            return;
        }

        String doctorName = userRepository.findById(appt.getDoctorId())
            .map(User::getName).orElse("the doctor");

        // CHAT-011: patient joined but doctor did not
        if (patientJoined && !doctorJoined) {
            log.warn("[NoShowScheduler] Doctor no-show detected for apptId={}", appt.getId());
            chatNotificationService.sendDoctorNoShow(
                appt.getDoctorId(), appt.getRecipientId(),
                doctorName, clinicPhone,
                appt.getSponsorId(), appt.getId()
            );
        }
    }
}
