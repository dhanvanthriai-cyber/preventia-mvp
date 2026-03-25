package com.preventia.appointment.service;

import com.preventia.appointment.dto.DailyRoomProvisionResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Integrates with the Daily.co REST API to:
 *  1. Create a private, time-bounded video room for each appointment.
 *  2. Issue per-participant meeting tokens (Doctor, Recipient, Sponsor).
 *
 * Design (ops/DAILY_CO_RESEARCH.md):
 *  - privacy: "private"           — DPDP / HIPAA-adjacent compliance
 *  - max_participants: 3          — Doctor + Recipient + NRI Sponsor
 *  - enable_prejoin_ui: false     — reduces friction for elderly parents
 *  - enable_knocking: false       — no waiting-room queue confusion
 *  - eject_at_room_exp: true      — guarantees meeting-ended webhook fires → EMR lock
 */
@Service
public class DailyRoomService {

    private static final Logger log            = LoggerFactory.getLogger(DailyRoomService.class);
    private static final int    MAX_PARTICIPANTS = 3;
    private static final String STUB_SENTINEL = "STUB";
    private static final String STUB_ROOM_URL_BASE = "https://preventia.daily.co/";

    private final RestClient restClient;
    private final boolean stubMode;

    public DailyRoomService(@Qualifier("dailyRestClient") RestClient restClient,
                            @Value("${daily.api-key:STUB}") String dailyApiKey) {
        this.restClient = restClient;
        this.stubMode = isStubKey(dailyApiKey);
    }

    public DailyRoomProvisionResult provision(
            String appointmentId, OffsetDateTime endTime,
            Long doctorId, String doctorName,
            Long recipientId, String recipientName,
            Long sponsorId, String sponsorName) {

        long expEpoch = endTime.toInstant().getEpochSecond();
        String roomName = "preventia-appt-" + appointmentId;
        if (stubMode) {
            return stubProvisionResult(roomName, doctorId, doctorName, recipientId, recipientName, sponsorId, sponsorName);
        }

        String roomUrl = createRoom(roomName, expEpoch);
        log.info("[DailyRoomService] Room created: {} exp={}", roomName, expEpoch);

        String doctorToken    = createToken(roomName, doctorName,    String.valueOf(doctorId),    true,  expEpoch);
        String recipientToken = createToken(roomName, recipientName, String.valueOf(recipientId), false, expEpoch);
        String sponsorToken   = null;

        if (sponsorId != null && sponsorName != null) {
            sponsorToken = createToken(roomName, sponsorName + " (Sponsor)", String.valueOf(sponsorId), false, expEpoch);
        }

        return new DailyRoomProvisionResult(roomUrl, roomName, doctorToken, recipientToken, sponsorToken);
    }

    /**
     * Re-issues fresh Daily.co meeting tokens for an existing room.
     * Called by the /tokens endpoint when the frontend needs tokens
     * after appointment creation (tokens are not stored in the DB).
     *
     * @param roomName      the Daily.co room name (stored on the Appointment entity)
     * @param endTime       appointment end time — used as token expiry
     * @param doctorId      DB user ID of the doctor
     * @param doctorName    display name for the doctor
     * @param recipientId   DB user ID of the patient
     * @param recipientName display name for the patient
     * @param sponsorId     nullable sponsor user ID
     * @param sponsorName   nullable sponsor display name
     */
    public DailyRoomProvisionResult issueTokens(
            String roomName, OffsetDateTime endTime,
            Long doctorId, String doctorName,
            Long recipientId, String recipientName,
            Long sponsorId, String sponsorName) {

        long expEpoch = endTime.toInstant().getEpochSecond();
        if (stubMode) {
            return stubProvisionResult(roomName, doctorId, doctorName, recipientId, recipientName, sponsorId, sponsorName);
        }

        // Derive the room URL from the room name (Daily.co uses a fixed URL pattern)
        String roomUrl = STUB_ROOM_URL_BASE + roomName;

        String doctorToken    = createToken(roomName, doctorName,    String.valueOf(doctorId),    true,  expEpoch);
        String recipientToken = createToken(roomName, recipientName, String.valueOf(recipientId), false, expEpoch);
        String sponsorToken   = null;
        if (sponsorId != null && sponsorName != null) {
            sponsorToken = createToken(roomName, sponsorName + " (Sponsor)", String.valueOf(sponsorId), false, expEpoch);
        }

        log.info("[DailyRoomService] Tokens re-issued for room={}", roomName);
        return new DailyRoomProvisionResult(roomUrl, roomName, doctorToken, recipientToken, sponsorToken);
    }

    private DailyRoomProvisionResult stubProvisionResult(
            String roomName,
            Long doctorId, String doctorName,
            Long recipientId, String recipientName,
            Long sponsorId, String sponsorName) {

        String roomUrl = STUB_ROOM_URL_BASE + roomName;
        String doctorToken = stubToken("doctor", roomName, doctorId, doctorName);
        String recipientToken = stubToken("recipient", roomName, recipientId, recipientName);
        String sponsorToken = null;

        if (sponsorId != null && sponsorName != null) {
            sponsorToken = stubToken("sponsor", roomName, sponsorId, sponsorName);
        }

        log.info("[DailyRoomService] STUB mode — skipping Daily API calls for room={}", roomName);
        return new DailyRoomProvisionResult(roomUrl, roomName, doctorToken, recipientToken, sponsorToken);
    }

    private static String stubToken(String role, String roomName, Long userId, String userName) {
        String safeName = (userName == null || userName.isBlank())
                ? role
                : userName.replaceAll("[^a-zA-Z0-9]+", "_").replaceAll("^_+|_+$", "").toLowerCase();
        return "stub_daily_" + role + "_" + roomName + "_" + userId + "_" + safeName + "_" +
                UUID.nameUUIDFromBytes((roomName + ":" + role + ":" + userId).getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private static boolean isStubKey(String apiKey) {
        return apiKey == null || apiKey.isBlank() || apiKey.startsWith(STUB_SENTINEL);
    }

    @SuppressWarnings("unchecked")
    private String createRoom(String roomName, long expEpoch) {
        Map<String, Object> properties = new HashMap<>();
        properties.put("exp", expEpoch);
        properties.put("max_participants", MAX_PARTICIPANTS);
        properties.put("enable_prejoin_ui", false);
        properties.put("enable_knocking", false);
        properties.put("eject_at_room_exp", true);

        Map<String, Object> body = new HashMap<>();
        body.put("name", roomName);
        body.put("privacy", "private");
        body.put("properties", properties);

        Map<String, Object> response = restClient.post().uri("/rooms").body(body).retrieve().body(Map.class);
        if (response == null || !response.containsKey("url"))
            throw new DailyRoomException("Daily.co room creation returned no URL for: " + roomName);
        return (String) response.get("url");
    }

    @SuppressWarnings("unchecked")
    private String createToken(String roomName, String userName, String userId, boolean isOwner, long expEpoch) {
        Map<String, Object> props = new HashMap<>();
        props.put("room_name", roomName);
        props.put("exp", expEpoch);
        props.put("user_name", userName);
        props.put("user_id", userId);
        props.put("is_owner", isOwner);
        if (!isOwner && userName.endsWith("(Sponsor)")) {
            props.put("start_audio_off", true);
            props.put("start_video_off", true);
        }

        Map<String, Object> response = restClient.post().uri("/meeting-tokens")
                .body(Map.of("properties", props)).retrieve().body(Map.class);
        if (response == null || !response.containsKey("token"))
            throw new DailyRoomException("Daily.co token creation failed for user: " + userId);
        return (String) response.get("token");
    }

    public static class DailyRoomException extends RuntimeException {
        public DailyRoomException(String message) { super(message); }
    }
}
