package com.preventia.insights.service;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.insights.domain.LifestyleInsight;
import com.preventia.insights.repository.InsightReactionRepository;
import com.preventia.insights.repository.LifestyleInsightRepository;
import com.preventia.insights.dto.InsightResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * InsightsBroadcastService — orchestrates the full lifecycle of a lifestyle insight post.
 *
 * Flow:
 *   1. Persist the insight to lifestyle_insights table.
 *   2. Resolve all unique patient IDs associated with this doctor via appointment history.
 *   3. Broadcast to the Stream insights channel (upserts channel + membership, then posts).
 *   4. Store the returned Stream message ID for traceability.
 *
 * Sprint-11: Lifestyle Insights Broadcast
 */
@Service
@Transactional
public class InsightsBroadcastService {

    private static final Logger log = LoggerFactory.getLogger(InsightsBroadcastService.class);

    private final LifestyleInsightRepository insightRepo;
    private final InsightReactionRepository  reactionRepo;
    private final AppointmentRepository      appointmentRepo;
    private final InsightsChannelService     insightsChannelService;

    public InsightsBroadcastService(LifestyleInsightRepository insightRepo,
                                    InsightReactionRepository reactionRepo,
                                    AppointmentRepository appointmentRepo,
                                    InsightsChannelService insightsChannelService) {
        this.insightRepo           = insightRepo;
        this.reactionRepo          = reactionRepo;
        this.appointmentRepo       = appointmentRepo;
        this.insightsChannelService = insightsChannelService;
    }

    // -------------------------------------------------------------------------
    // Publish
    // -------------------------------------------------------------------------

    /**
     * Persist and broadcast a new insight from a doctor.
     *
     * @param doctorId   ID of the authenticated doctor
     * @param doctorName Display name of the doctor (snapshot)
     * @param category   Insight category (NUTRITION, FITNESS, MENTAL_HEALTH, SLEEP, GENERAL)
     * @param title      Insight headline
     * @param body       Insight body text
     * @return the saved entity (with stream_message_id populated when Stream is live)
     */
    public LifestyleInsight publish(Long doctorId, String doctorName,
                                    String category, String title, String body) {

        // 1. Persist
        LifestyleInsight insight = new LifestyleInsight(doctorId, doctorName, category, title, body);
        insight = insightRepo.save(insight);

        // 2. Resolve all distinct patients who have ever consulted this doctor
        List<Long> patientIds = appointmentRepo.findByDoctorId(doctorId)
            .stream()
            .map(Appointment::getRecipientId)
            .distinct()
            .collect(Collectors.toList());

        log.info("[InsightsBroadcast] Publishing insightId={} from doctor={} to {} patients",
            insight.getId(), doctorId, patientIds.size());

        // 3. Broadcast via Stream (best-effort — never fails the publish)
        String streamMessageId = insightsChannelService.broadcastInsight(
            doctorId, doctorName, patientIds, insight
        );

        // 4. Store Stream message ID
        insight.setStreamMessageId(streamMessageId);
        return insightRepo.save(insight);
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    /**
     * Fetch insights posted by a specific doctor, newest first.
     * Used for the doctor's own LIFESTYLE INSIGHTS feed.
     */
    @Transactional(readOnly = true)
    public List<InsightResponse> getInsightsByDoctor(Long doctorId, Long viewerUserId) {
        return insightRepo.findByDoctorIdOrderByCreatedAtDesc(doctorId)
            .stream()
            .map(i -> toResponse(i, viewerUserId))
            .collect(Collectors.toList());
    }

    /**
     * Fetch insights from all doctors a patient has consulted, newest first.
     * Used for the patient's HEALTH INSIGHTS / PatientInsightsPage feed.
     */
    @Transactional(readOnly = true)
    public List<InsightResponse> getInsightsForPatient(Long patientId) {
        List<Long> doctorIds = appointmentRepo.findByRecipientId(patientId)
            .stream()
            .map(Appointment::getDoctorId)
            .distinct()
            .collect(Collectors.toList());

        if (doctorIds.isEmpty()) {
            return List.of();
        }

        return insightRepo.findByDoctorIdInOrderByCreatedAtDesc(doctorIds)
            .stream()
            .map(i -> toResponse(i, patientId))
            .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Reactions
    // -------------------------------------------------------------------------

    /**
     * Toggle a "like" reaction on an insight for the given user.
     * Returns true if the reaction was added, false if it was removed (toggle).
     */
    public boolean toggleReaction(Long insightId, Long userId, String reactionType) {
        // Validate insight exists
        insightRepo.findById(insightId)
            .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                "Insight not found: " + insightId));

        String type = reactionType == null || reactionType.isBlank() ? "like" : reactionType;

        var existing = reactionRepo.findByInsightIdAndUserIdAndReaction(insightId, userId, type);
        if (existing.isPresent()) {
            reactionRepo.delete(existing.get());
            log.debug("[InsightsBroadcast] Removed {} reaction: insight={} user={}", type, insightId, userId);
            return false;
        } else {
            reactionRepo.save(new com.preventia.insights.domain.InsightReaction(insightId, userId, type));
            log.debug("[InsightsBroadcast] Added {} reaction: insight={} user={}", type, insightId, userId);
            return true;
        }
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private InsightResponse toResponse(LifestyleInsight insight, Long viewerUserId) {
        long likeCount = reactionRepo.countByInsightIdAndReaction(insight.getId(), "like");
        boolean likedByMe = viewerUserId != null &&
            reactionRepo.findByInsightIdAndUserIdAndReaction(insight.getId(), viewerUserId, "like").isPresent();
        return InsightResponse.from(insight, likeCount, likedByMe);
    }
}
