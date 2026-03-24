package com.preventia.appointment.service;

import com.preventia.appointment.dto.DailyRoomProvisionResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import java.io.InputStream;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
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
                .requestFactory(buildRequestFactory())
                .build();
    }

    /**
     * Builds an HttpComponentsClientHttpRequestFactory backed by an SSLContext that
     * trusts both the default JVM cacerts AND the Amazon intermediate/root CAs bundled
     * under src/main/resources/certs/.
     *
     * This means the app works even when the container image's cacerts is missing the
     * Amazon RSA 2048 M03 intermediate — no image rebuild required.
     */
    private static HttpComponentsClientHttpRequestFactory buildRequestFactory() {
        try {
            // 1. Start from the JVM's default trust store
            TrustManagerFactory defaultTmf =
                    TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            defaultTmf.init((KeyStore) null);   // null → uses the JVM cacerts

            // 2. Build a new KeyStore with the bundled Amazon certs added on top
            KeyStore ks = KeyStore.getInstance(KeyStore.getDefaultType());
            ks.load(null, null);   // empty store — we'll populate it manually

            // Copy entries from the default trust store into our KeyStore
            KeyStore defaultKs = KeyStore.getInstance(KeyStore.getDefaultType());
            String cacertsPath = System.getProperty("java.home") + "/lib/security/cacerts";
            try (InputStream is = new java.io.FileInputStream(cacertsPath)) {
                defaultKs.load(is, "changeit".toCharArray());
            } catch (Exception ignored) {
                // If we can't read the default store, continue with just the bundled certs
            }
            java.util.Enumeration<String> aliases = defaultKs.aliases();
            while (aliases.hasMoreElements()) {
                String alias = aliases.nextElement();
                ks.setCertificateEntry(alias, defaultKs.getCertificate(alias));
            }

            // 3. Add the bundled Amazon certs
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            List<String> bundled = List.of(
                    "certs/amazon-rsa-2048-m03.pem",
                    "certs/amazon-root-ca-1.pem"
            );
            for (String path : bundled) {
                try (InputStream is = new ClassPathResource(path).getInputStream()) {
                    X509Certificate cert = (X509Certificate) cf.generateCertificate(is);
                    String alias = "bundled-" + cert.getSubjectX500Principal().getName()
                            .replaceAll("[^a-zA-Z0-9]", "-").toLowerCase();
                    ks.setCertificateEntry(alias, cert);
                    log.info("[DailyRoomService] Trusted bundled cert: {}", cert.getSubjectX500Principal());
                }
            }

            // 4. Build SSLContext from the merged trust store
            TrustManagerFactory tmf =
                    TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            tmf.init(ks);

            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, tmf.getTrustManagers(), null);

            // 5. Wire into Apache HttpClient (used by HttpComponentsClientHttpRequestFactory)
            org.apache.hc.client5.http.impl.classic.CloseableHttpClient httpClient =
                    org.apache.hc.client5.http.impl.classic.HttpClients.custom()
                            .setConnectionManager(
                                    org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder.create()
                                            .setSSLSocketFactory(
                                                    org.apache.hc.client5.http.ssl.SSLConnectionSocketFactory.builder()
                                                            .setSslContext(sslContext)
                                                            .build()
                                            )
                                            .build()
                            )
                            .build();

            return new HttpComponentsClientHttpRequestFactory(httpClient);

        } catch (Exception e) {
            log.warn("[DailyRoomService] Could not build custom SSLContext — falling back to JVM default. Cause: {}", e.getMessage());
            return new HttpComponentsClientHttpRequestFactory();
        }
    }

    public DailyRoomProvisionResult provision(
            String appointmentId, OffsetDateTime endTime,
            Long doctorId, String doctorName,
            Long recipientId, String recipientName,
            Long sponsorId, String sponsorName) {

        long expEpoch = endTime.toInstant().getEpochSecond();
        String roomName = "preventia-appt-" + appointmentId;

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
        // Derive the room URL from the room name (Daily.co uses a fixed URL pattern)
        String roomUrl = "https://preventia.daily.co/" + roomName;

        String doctorToken    = createToken(roomName, doctorName,    String.valueOf(doctorId),    true,  expEpoch);
        String recipientToken = createToken(roomName, recipientName, String.valueOf(recipientId), false, expEpoch);
        String sponsorToken   = null;
        if (sponsorId != null && sponsorName != null) {
            sponsorToken = createToken(roomName, sponsorName + " (Sponsor)", String.valueOf(sponsorId), false, expEpoch);
        }

        log.info("[DailyRoomService] Tokens re-issued for room={}", roomName);
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
