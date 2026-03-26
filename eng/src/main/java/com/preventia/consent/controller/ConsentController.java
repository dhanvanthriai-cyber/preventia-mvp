package com.preventia.consent.controller;

import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.auth.repository.UserRepository;
import com.preventia.chat.service.ChatNotificationService;
import com.preventia.consent.dto.ConsentCheckResponse;
import com.preventia.consent.dto.ConsentRequest;
import com.preventia.consent.repository.ConsentRecordRepository;
import com.preventia.consent.service.ConsentService;
import com.preventia.family.domain.User;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.Instant;
import java.util.Map;

/**
 * ConsentController — manages pre-consultation consent gate.
 *
 * GET  /api/v1/consent/check?appointmentId={id}  → { required: true/false }
 * POST /api/v1/consent                            → 201 Created
 */
@RestController
@RequestMapping("/api/v1/consent")
public class ConsentController {

    private final ConsentService          consentService;
    private final UserRepository          userRepository;
    private final ChatNotificationService chatNotificationService;
    private final AppointmentRepository   appointmentRepository;
    private final ConsentRecordRepository consentRecordRepository;

    public ConsentController(ConsentService consentService,
                             UserRepository userRepository,
                             ChatNotificationService chatNotificationService,
                             AppointmentRepository appointmentRepository,
                             ConsentRecordRepository consentRecordRepository) {
        this.consentService          = consentService;
        this.userRepository          = userRepository;
        this.chatNotificationService = chatNotificationService;
        this.appointmentRepository   = appointmentRepository;
        this.consentRecordRepository = consentRecordRepository;
    }

    /**
     * GET /api/v1/consent/check?appointmentId={id}
     *
     * Returns whether the authenticated user still needs to consent for this
     * appointment before they can join the consultation.
     */
    @GetMapping("/check")
    public ResponseEntity<ConsentCheckResponse> checkConsent(
            @RequestParam Long appointmentId,
            Authentication authentication) {

        Long userId = resolveUserId(authentication);
        return ResponseEntity.ok(consentService.checkRequired(userId, appointmentId));
    }

    /**
     * POST /api/v1/consent
     *
     * Records the user's consent for a specific appointment.
     * Body: { appointmentId: Long, recordingConsent: boolean }
     * Response: 201 Created
     */
    @PostMapping
    public ResponseEntity<Void> recordConsent(
            @RequestBody ConsentRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {

        Long userId   = resolveUserId(authentication);
        String ip     = httpRequest.getRemoteAddr();
        consentService.recordConsent(userId, request, ip);
        return ResponseEntity.created(URI.create("/api/v1/consent")).build();
    }

    // -------------------------------------------------------------------------
    // CHAT-009: Send consent request via Stream Chat
    // -------------------------------------------------------------------------

    /**
     * POST /api/v1/consent/send-to-chat
     * DOCTOR or ADMIN sends an interactive consent request to the patient's chat channel.
     * Body: { "appointmentId": 42, "consentType": "RECORDING" }
     */
    @PostMapping("/send-to-chat")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<Void> sendConsentToChat(
            @RequestBody Map<String, Object> body) {

        Long appointmentId = Long.parseLong(body.get("appointmentId").toString());
        String consentType = body.getOrDefault("consentType", "TELECONSULT").toString();

        var appt = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new EntityNotFoundException("Appointment not found: " + appointmentId));

        chatNotificationService.sendConsentRequest(
            appt.getDoctorId(), appt.getRecipientId(), consentType
        );

        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/v1/consent/acknowledge
     * Patient acknowledges a consent request received in chat.
     * Body: { "appointmentId": 42, "consentType": "RECORDING" }
     * Creates a ConsentRecord and returns 201.
     */
    @PostMapping("/acknowledge")
    @PreAuthorize("hasRole('RECIPIENT')")
    public ResponseEntity<Map<String, Object>> acknowledgeConsent(
            @RequestBody Map<String, Object> body,
            Authentication authentication,
            HttpServletRequest httpRequest) {

        Long appointmentId = Long.parseLong(body.get("appointmentId").toString());
        boolean recordingConsent = "RECORDING".equalsIgnoreCase(
            body.getOrDefault("consentType", "").toString());

        Long userId = resolveUserId(authentication);
        String ip   = httpRequest.getRemoteAddr();

        ConsentRequest req = new ConsentRequest(appointmentId, recordingConsent);
        consentService.recordConsent(userId, req, ip);

        return ResponseEntity.status(201).body(Map.of(
            "status",    "acknowledged",
            "signedAt",  Instant.now().toString(),
            "userId",    userId
        ));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Long resolveUserId(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + email));
        return user.getId();
    }
}
