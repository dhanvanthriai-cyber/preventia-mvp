# SPRINT-07 — Chat & Video Foundation (P0 + Core P1)
**Agent:** eng | **Priority:** 🔴 CRITICAL | **Estimated time:** 6h
**Status:** ⬜ NOT STARTED
**Depends on:** Video/chat bug fixes committed (305f200 ✅)

---

## Context

The 5 core video/chat bugs were fixed in commit `305f200` (March 2026):
- Webhook field mismatch fixed (EMR lock now fires)
- activate/complete endpoints now allow RECIPIENT + SPONSOR
- Double completeAppointment() removed from shared hook
- authToken wired into shared useDailySession for mobile

This sprint builds the foundational flows on top of that stable base.
All files live in `/home/ubuntu/.openclaw/workspace/eng/`.

---

## TASK 1 — CHAT-001: Dynamic Doctor-Patient Channel Wiring (P0)

**Files to edit:**
- `src/main/java/com/preventia/chat/controller/ChatController.java`
- `src/main/java/com/preventia/chat/service/StreamChatService.java`
- `web-app/src/components/PatientDashboard.tsx`
- `web-app/src/components/ChatPanel.tsx`

**Problem:**
`PatientDashboard.tsx` passes `peerUserId="1"` hardcoded to `ChatPanel`.
Every patient in the system talks to user ID 1 (or nobody if that ID doesn't exist).

**Fix:**

### Backend — new endpoint `GET /api/v1/chat/peer`

Add to `ChatController`:
```java
/**
 * GET /api/v1/chat/peer
 * Returns the Stream userId of the peer the calling user should chat with:
 *   - RECIPIENT → their assigned doctor's userId (from most recent appointment)
 *   - DOCTOR → list of their patient userIds (all recipients with appointments)
 */
@GetMapping("/peer")
public ResponseEntity<Map<String, Object>> getChatPeer(Authentication authentication) {
    String email = authentication.getName();
    User user = userRepository.findByEmail(email)
        .orElseThrow(() -> new IllegalStateException("User not found"));

    // For RECIPIENT: return the doctor from their latest SCHEDULED or ACTIVE appointment
    // For DOCTOR: return list of recipient user IDs they have appointments with
    // Return: { "peerUserId": "42" } or { "peerUserIds": ["12","34"] }
    return ResponseEntity.ok(streamChatService.resolvePeer(user));
}
```

Add `resolvePeer(User user)` to `StreamChatService` — inject `AppointmentRepository`:
- If `user.getRole() == RECIPIENT`: query `appointmentRepository.findTopByRecipientIdOrderByStartTimeDesc(user.getId())`, return `{ peerUserId: String.valueOf(appt.getDoctorId()) }`
- If `user.getRole() == DOCTOR`: query `appointmentRepository.findByDoctorId(user.getId())`, collect distinct recipientIds, return `{ peerUserIds: [...] }`

### Frontend — PatientDashboard.tsx

Replace:
```tsx
<ChatPanel userName={user.name} height={500} peerUserId="1" peerName="Dr. Preventia" />
```

With a useEffect that calls `GET /api/v1/chat/peer` and sets `peerUserId` from the response:
```tsx
const [peerUserId, setPeerUserId] = useState<string | null>(null);
const [peerName, setPeerName] = useState<string>('Your Doctor');

useEffect(() => {
  const jwt = getTokenFromCookie();
  fetch('/api/v1/chat/peer', { headers: { Authorization: `Bearer ${jwt}` } })
    .then(r => r.json())
    .then(data => {
      if (data.peerUserId) setPeerUserId(data.peerUserId);
      if (data.peerName) setPeerName(data.peerName);
    })
    .catch(console.error);
}, []);

// Only render ChatPanel once peerUserId is resolved
{peerUserId && <ChatPanel userName={user.name} height={500} peerUserId={peerUserId} peerName={peerName} />}
```

**Acceptance Criteria:**
- [ ] Patient dashboard resolves the real doctor userId from the latest appointment
- [ ] Channel creation is idempotent (same sorted pair ID)
- [ ] Doctor dashboard shows all patient channels in ChannelList
- [ ] Works on web (Next.js)

---

## TASK 2 — VIDEO-005: Auto-End Zombie ACTIVE Rooms (P0)

**Files to create/edit:**
- `src/main/java/com/preventia/appointment/scheduler/ZombieRoomScheduler.java` (new)
- `src/main/java/com/preventia/appointment/service/AppointmentService.java`
- `src/main/java/com/preventia/appointment/repository/AppointmentRepository.java`

**Problem:**
If both participants drop without a formal `leave()` call (e.g., crash, network loss), the Daily.co webhook may never fire. The appointment stays `ACTIVE` indefinitely — EMR stays unlocked, billing can't close.

**Fix — Create `ZombieRoomScheduler`:**

```java
@Component
public class ZombieRoomScheduler {

    private static final Logger log = LoggerFactory.getLogger(ZombieRoomScheduler.class);
    // Rooms ACTIVE for more than this many minutes with no participants → auto-end
    private static final int ZOMBIE_THRESHOLD_MINUTES = 15;

    private final AppointmentRepository appointmentRepository;
    private final AppointmentService appointmentService;
    private final DailyRoomService dailyRoomService;

    // Run every 5 minutes
    @Scheduled(fixedDelay = 5 * 60 * 1000)
    public void terminateZombieRooms() {
        Instant cutoff = Instant.now().minus(ZOMBIE_THRESHOLD_MINUTES, ChronoUnit.MINUTES);
        List<Appointment> activeAppointments = appointmentRepository
            .findByStatusAndEndTimeBefore(AppointmentStatus.ACTIVE, cutoff);

        for (Appointment appt : activeAppointments) {
            try {
                log.warn("[ZombieRoomScheduler] Auto-ending zombie room: apptId={} room={}",
                    appt.getId(), appt.getDailyRoomName());
                appointmentService.completeAppointment(appt.getId());
                appointmentService.lockAppointment(appt.getId());
            } catch (Exception e) {
                log.error("[ZombieRoomScheduler] Failed to end zombie room {}: {}",
                    appt.getDailyRoomName(), e.getMessage());
            }
        }
    }
}
```

Add to `AppointmentRepository`:
```java
List<Appointment> findByStatusAndEndTimeBefore(AppointmentStatus status, Instant cutoff);
```

Enable scheduling in main app class with `@EnableScheduling`.

**Acceptance Criteria:**
- [ ] Appointments `ACTIVE` past their `end_time + 15min` are auto-transitioned to LOCKED
- [ ] Scheduler runs every 5 minutes
- [ ] Event logged as a comment in appointment notes or `webhook_event_log`
- [ ] Does not double-process already LOCKED appointments (idempotent)

---

## TASK 3 — CONSULT-004: Consent Gate Before Video Join (P0)

**Files to create/edit:**
- `src/main/java/com/preventia/consent/` (new package — controller, service, domain, repository)
- `web-app/src/components/ConsentGate.tsx` (new)
- `web-app/src/components/DoctorConsultPageClient.tsx`
- `web-app/src/components/PatientConsultPageClient.tsx`

**Backend — consent_records table:**

Add migration `V17__consent_records.sql`:
```sql
CREATE TABLE consent_records (
    id                  BIGSERIAL       PRIMARY KEY,
    user_id             BIGINT          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    appointment_id      BIGINT          REFERENCES appointments(id) ON DELETE SET NULL,
    consent_type        VARCHAR(30)     NOT NULL DEFAULT 'TELECONSULT',
    recording_consent   BOOLEAN         NOT NULL DEFAULT FALSE,
    consented_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    ip_address          VARCHAR(45),
    user_agent          TEXT
);
CREATE INDEX idx_consent_user_appt ON consent_records (user_id, appointment_id);
```

**Endpoints:**
- `GET /api/v1/consent/check?appointmentId={id}` → `{ required: true/false }`
  - Returns `required: true` if no consent record for this user + appointmentId
- `POST /api/v1/consent` → body: `{ appointmentId, recordingConsent: boolean }`
  - Creates `consent_records` row, returns `{ consentToken: UUID }`

**Frontend — ConsentGate.tsx:**

Wrap the consult page: check consent before showing the pre-call UI.
```tsx
// ConsentGate renders either:
//   - The consent form (first time)
//   - children (already consented)
export default function ConsentGate({ appointmentId, children }) {
  const [checked, setChecked] = useState(false);
  const [required, setRequired] = useState(false);
  const [recordingConsent, setRecordingConsent] = useState(false);

  useEffect(() => {
    // Check if consent is required
    fetch(`/api/v1/consent/check?appointmentId=${appointmentId}`, ...)
      .then(r => r.json())
      .then(d => { setRequired(d.required); setChecked(true); });
  }, [appointmentId]);

  const handleConsent = async () => {
    await fetch('/api/v1/consent', {
      method: 'POST',
      body: JSON.stringify({ appointmentId, recordingConsent }),
      ...
    });
    setRequired(false);
  };

  if (!checked) return <LoadingSpinner />;
  if (!required) return children;

  return <ConsentForm onConsent={handleConsent} recordingConsent={recordingConsent}
    onRecordingToggle={setRecordingConsent} />;
}
```

Wrap both `DoctorConsultPageClient` and `PatientConsultPageClient` with `<ConsentGate appointmentId={appointmentId}>`.

**Acceptance Criteria:**
- [ ] First-time joining → consent form shown before anything else
- [ ] Already consented → consent gate is bypassed instantly
- [ ] `consent_records` row created with user ID, appointment ID, timestamp
- [ ] Recording preference stored and passed to `DailyRoomService` (future use)

---

## TASK 4 — VIDEO-007: Waiting Room + "Doctor Is Ready" Notification (P1)

**Files to create/edit:**
- `web-app/src/components/WaitingRoom.tsx` (new)
- `web-app/src/components/PatientConsultPageClient.tsx`
- `src/main/java/com/preventia/appointment/controller/AppointmentController.java`

**Problem:**
Patients currently drop straight into the Daily.co video room. If the doctor isn't there yet, they see an empty room with no context.

**Fix — WaitingRoom component:**

```tsx
// WaitingRoom.tsx
// Shows while appointment.status === 'SCHEDULED'
// Polls GET /api/v1/appointments/{id} every 15s
// When status becomes 'ACTIVE' (doctor joined), calls onDoctorReady()

export default function WaitingRoom({ appointmentId, doctorName, scheduledTime, onDoctorReady }) {
  const [status, setStatus] = useState('SCHEDULED');
  const [secondsUntil, setSecondsUntil] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      fetch(`/api/v1/appointments/${appointmentId}`, { headers: authHeaders() })
        .then(r => r.json())
        .then(d => {
          if (d.status === 'ACTIVE') {
            clearInterval(timer);
            onDoctorReady();
          }
        });
    }, 15_000);
    return () => clearInterval(timer);
  }, [appointmentId, onDoctorReady]);

  return (
    <div style={styles.waitingRoot}>
      <span style={styles.icon}>🩺</span>
      <h2>Waiting for Dr. {doctorName}</h2>
      <p>Your appointment is scheduled for {formatTime(scheduledTime)}</p>
      <p style={styles.hint}>Chat is available while you wait →</p>
      {/* Render ChatPanel here for pre-call messaging */}
    </div>
  );
}
```

In `PatientConsultPageClient`: show `WaitingRoom` if `appointment.status === 'SCHEDULED'`, switch to `ConsultationRoom` when `onDoctorReady()` fires.

**Acceptance Criteria:**
- [ ] Patient sees a friendly waiting room screen, not an empty Daily.co room
- [ ] Status polls every 15s — transitions to call view when status = ACTIVE
- [ ] Chat panel is available in the waiting room
- [ ] Countdown to scheduled time displayed

---

## TASK 5 — VIDEO-001: In-Call Chat Overlay (P1)

**Files to edit:**
- `web-app/src/components/ConsultationRoom.tsx`
- `web-app/src/components/ChatPanel.tsx`

**Problem:**
Doctor and patient have no way to share files, links, or messages during the video call without leaving the room.

**Fix:**
Add a slide-out chat panel inside `ConsultationRoom`:

```tsx
// In ConsultationRoom.tsx — add chat toggle state
const [chatOpen, setChatOpen] = useState(false);

// In the controls bar, add:
<button onClick={() => setChatOpen(o => !o)} style={styles.chatToggleBtn}>
  💬 {chatOpen ? 'CLOSE CHAT' : 'CHAT'}
</button>

// Below the video frame, conditionally render:
{chatOpen && roomStatus === 'ACTIVE' && (
  <div style={styles.chatOverlay}>
    <ChatPanel
      userName={patientName}
      height={320}
      // peerUserId resolved from appointment — pass as prop
      peerUserId={peerUserId}
    />
  </div>
)}
```

Pass `peerUserId` as a new prop to `ConsultationRoom` from both page clients.
`DoctorConsultPageClient` passes `String(appointment.recipientId)`.
`PatientConsultPageClient` passes `String(appointment.doctorId)`.

**Acceptance Criteria:**
- [ ] Chat toggle button visible in the call controls bar
- [ ] Chat panel slides open without interrupting video/audio
- [ ] Messages sent in-call persist in the same channel as async messages
- [ ] Chat panel hidden when call is IDLE or LOCKED

---

## TASK 6 — CHAT-002: Appointment Confirmation Message (P1)

**Files to create/edit:**
- `src/main/java/com/preventia/chat/service/ChatNotificationService.java` (new)
- `src/main/java/com/preventia/appointment/service/AppointmentService.java`

**Problem:**
When an appointment is booked, no confirmation message is sent to the patient or sponsor's chat channel.

**Fix — Create ChatNotificationService:**

```java
@Service
public class ChatNotificationService {

    private static final Logger log = LoggerFactory.getLogger(ChatNotificationService.class);

    @Value("${stream.api-key:STUB_KEY}")
    private String apiKey;

    @Value("${stream.api-secret:STUB_SECRET}")
    private String apiSecret;

    /**
     * Sends a system bot message to the doctor-patient channel
     * confirming an appointment has been booked.
     */
    public void sendAppointmentConfirmation(Appointment appt, String doctorName, String patientName) {
        if ("STUB_KEY".equals(apiKey)) {
            log.info("[ChatNotification] STUB mode — skipping confirmation for appt {}", appt.getId());
            return;
        }

        String channelId = buildChannelId(appt.getDoctorId(), appt.getRecipientId());
        String message = String.format(
            "✅ Appointment confirmed!\n\n" +
            "📅 %s IST\n" +
            "👨‍⚕️ Doctor: %s\n" +
            "🆔 Appointment ID: %d\n\n" +
            "You'll receive a reminder 1 hour before. Join using the link in your portal.",
            formatIst(appt.getStartTime()), doctorName, appt.getId()
        );

        sendSystemMessage(channelId, message, Map.of("appointmentId", appt.getId(), "type", "appointment_confirmation"));
    }

    private String buildChannelId(Long doctorId, Long recipientId) {
        // Deterministic: sorted IDs joined with __ (matches frontend logic)
        long lo = Math.min(doctorId, recipientId);
        long hi = Math.max(doctorId, recipientId);
        return lo + "__" + hi;
    }

    private void sendSystemMessage(String channelId, String text, Map<String, Object> extraData) {
        // Use Stream REST API directly (no official Java SDK needed)
        // POST https://chat.stream-io-api.com/channels/messaging/{channelId}/message
        // Authorization: Stream API key + HMAC signature
        // Body: { "message": { "text": "...", "user_id": "preventia-bot", "extra_data": {...} } }
        // Implement with RestClient (already in classpath)
        log.info("[ChatNotification] Sending system message to channel {}", channelId);
        // Implementation: see Stream REST API docs §Send Message
    }
}
```

Inject `ChatNotificationService` into `AppointmentService.createAppointment()` and call `sendAppointmentConfirmation()` after the Daily.co room is provisioned.

**Acceptance Criteria:**
- [ ] Booking triggers a system bot message in the doctor-patient channel
- [ ] Message contains: date/time IST, doctor name, appointment ID
- [ ] STUB mode: skips silently (no error if Stream credentials absent)
- [ ] Sponsor channel also receives confirmation (if sponsor is linked)

---

## Commit instructions

After each task:
```bash
cd /home/ubuntu/.openclaw/workspace/eng
git add -A
git commit -m "feat(sprint-07): <task name and ticket ID>"
git push origin main
```

Final commit after all tasks:
```bash
git commit -m "feat(sprint-07): chat & video foundation complete

- CHAT-001: dynamic doctor-patient channel wiring (removes hardcoded peerUserId=1)
- VIDEO-005: zombie room auto-termination scheduler (15min threshold)
- CONSULT-004: consent gate before video join + consent_records table (V17)
- VIDEO-007: patient waiting room with status polling
- VIDEO-001: in-call chat overlay panel
- CHAT-002: appointment confirmation system message via ChatNotificationService"
```
