package com.preventia.chat.controller;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.auth.repository.UserRepository;
import com.preventia.chat.dto.ChatPatientSearchResult;
import com.preventia.chat.dto.ChatTokenResponse;
import com.preventia.chat.service.ChatNotificationService;
import com.preventia.chat.service.StreamChatService;
import com.preventia.family.domain.User;
import com.preventia.family.repository.FamilyRelationshipRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * ChatController — issues Stream Chat user tokens.
 *
 * The endpoint is protected by Spring Security's JWT filter (all
 * non-whitelisted paths require a valid JWT).  The authenticated principal's
 * email is used to look up the full User record so the Stream token carries
 * the correct userId.
 *
 * No additional SecurityConfig entry needed — /api/v1/chat/** is covered by
 * the catch-all `.anyRequest().authenticated()` rule.
 */
@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private final StreamChatService            streamChatService;
    private final UserRepository               userRepository;
    private final AppointmentRepository        appointmentRepository;
    private final ChatNotificationService      chatNotificationService;
    private final FamilyRelationshipRepository familyRelationshipRepository;

    public ChatController(StreamChatService streamChatService,
                          UserRepository userRepository,
                          AppointmentRepository appointmentRepository,
                          ChatNotificationService chatNotificationService,
                          FamilyRelationshipRepository familyRelationshipRepository) {
        this.streamChatService            = streamChatService;
        this.userRepository               = userRepository;
        this.appointmentRepository        = appointmentRepository;
        this.chatNotificationService      = chatNotificationService;
        this.familyRelationshipRepository = familyRelationshipRepository;
    }

    /**
     * GET /api/v1/chat/token
     *
     * Returns a Stream Chat user token for the currently authenticated user.
     * The client uses this to call {@code StreamChat.connectUser()} on the
     * web and mobile SDKs.
     *
     * Response:
     * <pre>
     * {
     *   "token":  "eyJ...",
     *   "userId": "42",
     *   "apiKey": "9mb2bz..."
     * }
     * </pre>
     */
    @GetMapping("/token")
    public ResponseEntity<ChatTokenResponse> getChatToken(Authentication authentication) {
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + email));

        ChatTokenResponse response = streamChatService.generateToken(
            user.getId(),
            user.getName(),
            user.getRole().name()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/chat/peer
     *
     * Resolves the Stream Chat peer(s) for the currently authenticated user:
     * - RECIPIENT → their doctor from the most recent appointment
     *   Response: { "peerUserId": "42", "peerName": "Dr. Smith" }
     * - DOCTOR → all their patients
     *   Response: { "peerUserIds": ["12", "34"] }
     */
    @GetMapping("/peer")
    public ResponseEntity<Map<String, Object>> getChatPeer(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + email));

        Map<String, Object> result = new HashMap<>();

        if (user.getRole() == User.Role.RECIPIENT) {
            appointmentRepository.findTopByRecipientIdOrderByStartTimeDesc(user.getId())
                .ifPresent(appt -> {
                    result.put("peerUserId", appt.getDoctorId().toString());
                    // Resolve doctor name from users table
                    userRepository.findById(appt.getDoctorId())
                        .ifPresent(doc -> result.put("peerName", "Dr. " + doc.getName()));
                });
        } else if (user.getRole() == User.Role.DOCTOR) {
            List<Appointment> appts = appointmentRepository.findByDoctorId(user.getId());
            List<String> peerIds = appts.stream()
                .map(a -> a.getRecipientId().toString())
                .distinct()
                .collect(Collectors.toList());
            result.put("peerUserIds", peerIds);
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/patients/search")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<List<ChatPatientSearchResult>> searchPatients(
            @RequestParam("q") String query,
            Authentication authentication) {
        String email = authentication.getName();
        User doctor = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + email));

        String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        if (normalizedQuery.length() < 2) {
            return ResponseEntity.ok(List.of());
        }

        Set<Long> recipientIds = appointmentRepository.findByDoctorId(doctor.getId()).stream()
            .map(Appointment::getRecipientId)
            .filter(Objects::nonNull)
            .collect(Collectors.toCollection(LinkedHashSet::new));

        if (recipientIds.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<ChatPatientSearchResult> matches = userRepository.findAllById(recipientIds).stream()
            .filter(user -> user.getRole() == User.Role.RECIPIENT)
            .filter(user -> user.getName() != null && user.getName().toLowerCase(Locale.ROOT).contains(normalizedQuery))
            .sorted(
                Comparator
                    .comparing((User user) -> !user.getName().toLowerCase(Locale.ROOT).startsWith(normalizedQuery))
                    .thenComparing(User::getName, String.CASE_INSENSITIVE_ORDER)
            )
            .limit(8)
            .map(user -> new ChatPatientSearchResult(user.getId(), user.getName()))
            .toList();

        return ResponseEntity.ok(matches);
    }

    // -------------------------------------------------------------------------
    // CHAT-006: Post-consultation care summary to sponsor channel
    // -------------------------------------------------------------------------

    /**
     * POST /api/v1/chat/send-summary/{appointmentId}
     *
     * Doctor posts a care summary after consultation.
     * Sends to the sponsor-doctor channel as a tagged system message.
     *
     * Body: { "summary": "string" }
     */
    @PostMapping("/send-summary/{appointmentId}")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<Map<String, String>> sendCareSummary(
            @PathVariable Long appointmentId,
            @RequestBody Map<String, String> body,
            Authentication authentication) {

        Appointment appt = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new EntityNotFoundException("Appointment not found: " + appointmentId));

        if (appt.getSponsorId() == null) {
            return ResponseEntity.ok(Map.of("status", "no_sponsor", "message", "No sponsor linked to this appointment."));
        }

        String summary = body.getOrDefault("summary", "");
        if (summary.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "summary must not be blank"));
        }

        chatNotificationService.sendCareSummaryToSponsor(
            appt.getSponsorId(), appt.getDoctorId(), appointmentId, summary
        );

        return ResponseEntity.ok(Map.of("status", "sent", "channelId",
            "sponsor-" + appt.getSponsorId() + "__doctor-" + appt.getDoctorId()));
    }

    // -------------------------------------------------------------------------
    // CONSULT-005: Sponsor live update during active consultation
    // -------------------------------------------------------------------------

    /**
     * POST /api/v1/chat/live-update/{appointmentId}
     *
     * Doctor sends a live status update to the sponsor channel during an
     * active consultation. Message is tagged with liveUpdate=true for
     * UI differentiation (🔴 LIVE badge on sponsor side).
     *
     * Body: { "update": "Taking medical history" }
     */
    @PostMapping("/live-update/{appointmentId}")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<Map<String, String>> sendLiveUpdate(
            @PathVariable Long appointmentId,
            @RequestBody Map<String, String> body) {

        Appointment appt = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new EntityNotFoundException("Appointment not found: " + appointmentId));

        if (appt.getSponsorId() == null) {
            return ResponseEntity.ok(Map.of("status", "no_sponsor"));
        }

        String updateText = body.getOrDefault("update", "");
        if (updateText.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "update must not be blank"));
        }

        chatNotificationService.sendSponsorLiveUpdate(
            appt.getSponsorId(), appt.getDoctorId(), appointmentId, updateText
        );

        return ResponseEntity.ok(Map.of("status", "sent"));
    }
}
