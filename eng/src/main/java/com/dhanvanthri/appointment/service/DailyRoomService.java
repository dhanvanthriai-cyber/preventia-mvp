package com.dhanvanthri.appointment.service;

import com.dhanvanthri.appointment.dto.DailyRoomProvisionResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

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
    private static final String DAILY_API_BASE = "https://api.daily.co/v1";
    private static final int    MAX_PARTICIPANTS = 3;

    private final RestClient restClient;

    public DailyRoomService(@Value("${daily.api-key}") String apiKey) {
        this.restClient = RestClient.builder()
                .baseUrl(DAILY_API_BASE)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public DailyRoomProvisionResult provision(
            String appointmentId, OffsetDateTime endTime,
            Long doctorId, String doctorName,
            Long recipientId, String recipientName,
            Long sponsorId, String sponsorName) {

        long expEpoch = endTime.toInstant().getEpochSecond();
        String roomName = "dhanvanthri-appt-" + appointmentId;

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
