package com.preventia.insights.service;

import com.preventia.insights.domain.LifestyleInsight;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * InsightsChannelService — manages Stream Chat "insights-{doctorId}" channels.
 *
 * Channel type: livestream
 *   - Patients (members) are read-only by default in the livestream channel type.
 *   - Only the bot (server-side) can post messages.
 *   - Stream delivers push notifications (APNs/FCM) to offline members automatically.
 *
 * Stub mode: when stream.api-key == STUB_KEY, all operations log and return stub values.
 * No exceptions are thrown — failures are always logged and swallowed to avoid
 * breaking the insight publish flow.
 *
 * Sprint-11: Lifestyle Insights Broadcast
 */
@Service
public class InsightsChannelService {

    private static final Logger log = LoggerFactory.getLogger(InsightsChannelService.class);

    private static final String STUB_KEY      = "STUB_KEY";
    private static final String CHANNEL_TYPE  = "livestream";
    private static final String BOT_USER_ID   = "preventia-bot";
    private static final String STREAM_API    = "https://chat.stream-io-api.com";

    @Value("${stream.api-key:STUB_KEY}")
    private String apiKey;

    @Value("${stream.api-secret:STUB_SECRET}")
    private String apiSecret;

    private final RestClient restClient;

    public InsightsChannelService() {
        this.restClient = RestClient.create();
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Upsert the insights channel for a doctor, ensure all current patients are
     * members, then post the insight as a bot message.
     *
     * @return the Stream message ID, or a stub ID if in stub mode
     */
    public String broadcastInsight(Long doctorId, String doctorName,
                                   List<Long> patientIds, LifestyleInsight insight) {
        if (isStub()) {
            log.info("[InsightsChannel] STUB — would broadcast insightId={} doctorId={} to {} patients",
                insight.getId(), doctorId, patientIds.size());
            return "stub_msg_" + insight.getId();
        }

        String channelId = buildChannelId(doctorId);

        try {
            upsertChannel(channelId, doctorId, doctorName, patientIds);
            return postInsightMessage(channelId, insight);
        } catch (Exception e) {
            log.warn("[InsightsChannel] Broadcast failed for insightId={}: {}", insight.getId(), e.getMessage());
            return null;
        }
    }

    /**
     * Add a single patient as a member of a doctor's insights channel.
     * Called when a new appointment is booked so the patient starts receiving
     * all future insights immediately.
     *
     * No-ops gracefully if the channel does not yet exist (doctor hasn't posted yet).
     */
    public void addPatientToInsightsChannel(Long doctorId, Long patientId) {
        if (isStub()) {
            log.info("[InsightsChannel] STUB — would add patient={} to insights channel for doctor={}",
                patientId, doctorId);
            return;
        }

        String channelId = buildChannelId(doctorId);
        try {
            String jwt = buildBotJwt();
            String url = STREAM_API + "/channels/" + CHANNEL_TYPE + "/" + channelId;

            Map<String, Object> body = new HashMap<>();
            body.put("add_members", List.of(patientId.toString()));

            restClient.post()
                .uri(url)
                .header("Content-Type", "application/json")
                .header("Authorization", jwt)
                .header("stream-auth-type", "jwt")
                .body(body)
                .retrieve()
                .toBodilessEntity();

            log.info("[InsightsChannel] Added patient={} to insights channel for doctor={}", patientId, doctorId);
        } catch (Exception e) {
            // Channel may not exist yet — this is expected. Log at debug level.
            log.debug("[InsightsChannel] Could not add patient={} to channel {} (may not exist yet): {}",
                patientId, channelId, e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Deterministic channel ID: "insights-{doctorId}".
     * One channel per doctor — all their patients are members.
     */
    private String buildChannelId(Long doctorId) {
        return "insights-" + doctorId;
    }

    /**
     * Upsert the Stream livestream channel + add all members.
     * Stream handles idempotency — safe to call multiple times.
     */
    private void upsertChannel(String channelId, Long doctorId, String doctorName,
                                List<Long> patientIds) {
        List<String> memberIds = new ArrayList<>();
        memberIds.add(BOT_USER_ID);
        memberIds.add(doctorId.toString());
        patientIds.forEach(id -> memberIds.add(id.toString()));

        Map<String, Object> channelData = new HashMap<>();
        channelData.put("name", "Dr. " + doctorName + " — Health Insights");
        channelData.put("created_by_id", BOT_USER_ID);

        Map<String, Object> body = new HashMap<>();
        body.put("data", channelData);
        body.put("add_members", memberIds);

        String jwt = buildBotJwt();
        String url = STREAM_API + "/channels/" + CHANNEL_TYPE + "/" + channelId;

        restClient.post()
            .uri(url)
            .header("Content-Type", "application/json")
            .header("Authorization", jwt)
            .header("stream-auth-type", "jwt")
            .body(body)
            .retrieve()
            .toBodilessEntity();

        log.info("[InsightsChannel] Upserted channel={} with {} members", channelId, memberIds.size());
    }

    /**
     * Post the insight as a bot message on the channel.
     * Returns the Stream message ID.
     */
    @SuppressWarnings("unchecked")
    private String postInsightMessage(String channelId, LifestyleInsight insight) {
        String emoji = switch (insight.getCategory()) {
            case "NUTRITION"     -> "🥗";
            case "FITNESS"       -> "🏃";
            case "MENTAL_HEALTH" -> "🧘";
            case "SLEEP"         -> "😴";
            default              -> "💡";
        };

        String text = emoji + " " + insight.getTitle() + "\n\n" + insight.getBody();

        Map<String, Object> extraData = new HashMap<>();
        extraData.put("insightId", insight.getId());
        extraData.put("category",  insight.getCategory());
        extraData.put("type",      "lifestyle_insight");

        Map<String, Object> message = new HashMap<>();
        message.put("text",    text);
        message.put("user_id", BOT_USER_ID);
        message.put("custom",  extraData);

        Map<String, Object> body = Map.of("message", message);

        String jwt = buildBotJwt();
        String url = STREAM_API + "/channels/" + CHANNEL_TYPE + "/" + channelId + "/message";

        Map<String, Object> response = restClient.post()
            .uri(url)
            .header("Content-Type", "application/json")
            .header("Authorization", jwt)
            .header("stream-auth-type", "jwt")
            .body(body)
            .retrieve()
            .body(Map.class);

        String messageId = null;
        if (response != null && response.get("message") instanceof Map<?, ?> msg) {
            messageId = (String) msg.get("id");
        }

        log.info("[InsightsChannel] Posted insight={} to channel={}, streamMsgId={}",
            insight.getId(), channelId, messageId);
        return messageId;
    }

    private boolean isStub() {
        return STUB_KEY.equals(apiKey);
    }

    /** Generate a Stream server-side JWT for the preventia-bot user. */
    private String buildBotJwt() {
        SecretKey key = Keys.hmacShaKeyFor(apiSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
            .claim("user_id", BOT_USER_ID)
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }
}
