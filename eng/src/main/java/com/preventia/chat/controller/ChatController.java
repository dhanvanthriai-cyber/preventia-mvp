package com.preventia.chat.controller;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.auth.repository.UserRepository;
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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
}
