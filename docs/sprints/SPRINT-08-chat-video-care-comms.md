# SPRINT-08 — Care Communications (P1 Wave 2)
**Agent:** eng | **Priority:** 🟠 HIGH | **Estimated time:** 8h
**Status:** ⬜ NOT STARTED
**Depends on:** SPRINT-07 ✅ (ChatNotificationService must exist)

---

## Context

Builds on the `ChatNotificationService` and channel infrastructure from SPRINT-07.
All files live in `/home/ubuntu/.openclaw/workspace/eng/`.

---

## TASK 1 — CHAT-003: Pre-Consultation Reminder Messages (P1)

**Files to create/edit:**
- `src/main/java/com/preventia/chat/scheduler/AppointmentReminderScheduler.java` (new)
- `src/main/java/com/preventia/chat/service/ChatNotificationService.java`

**Fix:**
Create a Spring `@Scheduled` job that runs every 15 minutes and finds appointments
starting in ~24h or ~1h, sending reminder messages if not already sent.

Add `appointment_reminders` tracking table via `V18__appointment_reminders.sql`:
```sql
CREATE TABLE appointment_reminders (
    id              BIGSERIAL   PRIMARY KEY,
    appointment_id  BIGINT      NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    reminder_type   VARCHAR(10) NOT NULL,  -- '24H' | '1H'
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_appt_reminder UNIQUE (appointment_id, reminder_type)
);
```

Scheduler logic:
- Query appointments where `start_time BETWEEN now()+23h AND now()+25h` AND no `24H` reminder row → send 24h reminder
- Query appointments where `start_time BETWEEN now()+45min AND now()+75min` AND no `1H` reminder row → send 1h reminder
- Insert `appointment_reminders` row after successful send (prevents double-send)
- Skip if appointment status is CANCELLED, COMPLETED, or LOCKED

24h message template:
```
⏰ Reminder: Your consultation with Dr. {doctorName} is tomorrow at {time} IST.
Please have your medications list and any recent lab reports ready.
```

1h message template:
```
🔔 Your consultation starts in 1 hour.
Dr. {doctorName} will be ready at {time} IST.
Join here: {portalUrl}/patient/consult/{appointmentId}
```

**Acceptance Criteria:**
- [ ] Reminders sent at T-24h and T-1h; never duplicated
- [ ] Skipped if appointment cancelled
- [ ] Sponsor channel receives same reminders

---

## TASK 2 — CHAT-005: Urgent Message Flag & SLA Alert (P1)

**Files to edit:**
- `web-app/src/components/ChatPanel.tsx`
- `src/main/java/com/preventia/chat/controller/ChatController.java`
- `src/main/java/com/preventia/chat/scheduler/UrgentMessageSlaScheduler.java` (new)

**Frontend — custom message composer:**
Add an "🚨 URGENT" toggle button to the Stream Chat message input.
When toggled, set `message.extraData = { urgent: true }` before sending.
Use Stream's `MessageInputFlat` with a custom `additionalTextareaProps` or custom send button.

Urgent messages in the channel list and message list get a red `🚨` badge using
Stream's custom component `Message` override:
```tsx
const CustomMessage = (props) => {
  const isUrgent = props.message?.extraData?.urgent === true;
  return (
    <div style={isUrgent ? { borderLeft: '4px solid red', paddingLeft: 8 } : {}}>
      {isUrgent && <span style={{ color: 'red', fontSize: 11 }}>🚨 URGENT</span>}
      <MessageSimple {...props} />
    </div>
  );
};
```

**Backend — SLA scheduler:**
New `UrgentMessageSlaScheduler` runs every 30 minutes:
- `GET /api/v1/chat/urgent-unread` (internal) — calls Stream API to list messages with `extraData.urgent=true` in active channels
- If any urgent message is > 4h old without a reply, send admin email via `JavaMailSender`
- Log to `urgent_message_alerts` table

**Acceptance Criteria:**
- [ ] Patient can mark any message as urgent via toggle
- [ ] Urgent messages show red banner + 🚨 badge in doctor's UI
- [ ] No response after 4h → email alert to clinic admin
- [ ] Urgent flag survives channel history (stored in Stream extraData)

---

## TASK 3 — CHAT-006: Sponsor-Doctor Update Channel (P1)

**Files to edit:**
- `src/main/java/com/preventia/family/service/FamilyService.java`
- `src/main/java/com/preventia/chat/service/ChatNotificationService.java`
- `src/main/java/com/preventia/chat/controller/ChatController.java`

**Fix:**
When a sponsor is linked to a patient (consent GRANTED in `family_relationships`),
automatically create a separate Stream channel between the sponsor and the patient's doctor.

In `FamilyService.grantConsent()` (or wherever consent transitions to GRANTED):
```java
// After consent is GRANTED, create the sponsor-doctor channel
chatNotificationService.createSponsorDoctorChannel(
    sponsorId, doctorId, sponsorName, doctorName, patientName
);
```

In `ChatNotificationService`:
```java
public void createSponsorDoctorChannel(Long sponsorId, Long doctorId,
        String sponsorName, String doctorName, String patientName) {
    // Channel ID: "sponsor-{sponsorId}__doctor-{doctorId}"
    // Channel type: "messaging"
    // Members: [sponsorId, doctorId]
    // Initial message: "This is your private channel with Dr. {doctorName}.
    //                  You'll receive updates about {patientName}'s care here."
}
```

Add `POST /api/v1/chat/send-summary/{appointmentId}` endpoint:
- Doctor can call this post-consultation to push a summary to the sponsor channel
- Body: `{ summary: "string" }` — plain text care summary (not raw SOAP)
- Sends as a system message tagged `{ type: "care_summary", appointmentId }`

**Acceptance Criteria:**
- [ ] Sponsor-doctor channel created on consent GRANTED
- [ ] Channel is separate from patient's 1:1 channel (sponsor can't see patient's private messages)
- [ ] Doctor can post a care summary with one API call post-consultation
- [ ] Sponsor gets push notification for new messages in this channel

---

## TASK 4 — CHAT-007: Pharmacist-Doctor Prescription Clarification (P1)

**Files to create/edit:**
- `src/main/java/com/preventia/pharmacy/controller/PharmacyController.java`
- `src/main/java/com/preventia/chat/service/ChatNotificationService.java`

**Fix:**
Pharmacist needs to initiate a chat with the prescribing doctor when reviewing a prescription.

Add endpoint `POST /api/v1/chat/pharmacy/start-clarification`:
```java
@PostMapping("/pharmacy/start-clarification")
@PreAuthorize("hasRole('PHARMACIST')")
public ResponseEntity<Map<String, String>> startClarification(
    @RequestBody Map<String, Long> body,
    Authentication auth) {

    Long soapNoteId = body.get("soapNoteId");
    // Look up doctorId from soap_notes
    // Create Stream channel: "rx-{soapNoteId}"
    // Members: [pharmacistId, doctorId]
    // Initial message: "Clarification needed on prescription for appointment #{appointmentId}"
    // Log to prescription_audit_log: action = CLARIFICATION_REQUESTED
}
```

Log every pharmacist message to `prescription_audit_log` via a Stream webhook
`message.new` event (or call `AuditService` directly after channel creation).

**Acceptance Criteria:**
- [ ] Pharmacist can start a clarification thread per prescription
- [ ] Thread is tagged with prescription/soap note ID
- [ ] Doctor receives push notification with prescription context in preview
- [ ] Clarification action is recorded in `prescription_audit_log`

---

## TASK 5 — CHAT-010 & CHAT-011: No-Show Auto-Messages (P1)

**Files to edit:**
- `src/main/java/com/preventia/appointment/controller/DailyWebhookController.java`
- `src/main/java/com/preventia/appointment/service/AppointmentService.java`
- `src/main/java/com/preventia/chat/service/ChatNotificationService.java`
- `src/main/java/com/preventia/appointment/scheduler/NoShowScheduler.java` (new)

**CHAT-010 — Patient no-show:**
In `DailyWebhookController`, on `meeting-ended`:
- Compare `payload.participants` list against expected recipientId
- If recipient was never in the room, call `chatNotificationService.sendPatientNoShow(appointmentId)`

Message:
```
😔 We missed you today!
Your consultation with Dr. {doctorName} on {date} was missed.
Book your next appointment here: {portalUrl}/sponsor/book
```

**CHAT-011 — Doctor no-show:**
`NoShowScheduler` runs every 5 minutes:
- Find appointments with `status = SCHEDULED` and `start_time < now() - 10min`
- Check Daily.co room participants via `GET https://api.daily.co/v1/rooms/{roomName}`
- If patient has joined but doctor has not → send CHAT-011 message and alert clinic admin

Message to patient:
```
⏳ Dr. {doctorName} is running late.
Our support team has been notified. We'll have an update for you shortly.
Clinic contact: {clinicPhone}
```

**Acceptance Criteria:**
- [ ] Patient no-show message sent when recipient ID absent from Daily.co participants
- [ ] Doctor no-show message sent 10min after scheduled start if doctor hasn't joined
- [ ] Both messages sent to the relevant Stream channels
- [ ] Sponsor channel receives copies of both no-show messages

---

## TASK 6 — VIDEO-002: Sponsor Observer Join Flow (P1)

**Files to edit:**
- `src/main/java/com/preventia/appointment/service/DailyRoomService.java`
- `src/main/java/com/preventia/appointment/service/AppointmentService.java`
- `web-app/src/components/ChatPanel.tsx` or `ChatNotificationService.java`

**Fix:**
When an appointment goes `ACTIVE`, send the sponsor's join link to the sponsor-doctor channel.

In `AppointmentService.activateAppointment()`:
```java
// If appointment has a sponsorId, fetch their tokens and send join link
if (appt.getSponsorId() != null) {
    chatNotificationService.sendSponsorJoinLink(
        appt.getId(), appt.getSponsorId(),
        appt.getDailyRoomUrl(), appt.getDailyRoomName()
    );
}
```

`ChatNotificationService.sendSponsorJoinLink()` sends to the sponsor-doctor channel:
```
🔴 Consultation is now live!
{patientName}'s consultation with Dr. {doctorName} has started.
Join as an observer: {dailyRoomUrl}?t={sponsorToken}
Note: Your camera and mic will be off by default.
```

Sponsor meeting token is already generated with `start_audio_off: true, start_video_off: true`
in `DailyRoomService`. The token should be included in the join URL as a query param.

**Acceptance Criteria:**
- [ ] Sponsor receives join link in chat when consultation goes ACTIVE
- [ ] Sponsor joins with camera/mic off by default
- [ ] Doctor sees "Sponsor joined" toast (Daily.co participant metadata includes role)
- [ ] Patient consent controls sponsor join (future: booking-time toggle)

---

## TASK 7 — VIDEO-003: Audio-Only Fallback + VIDEO-006: Pre-Call Device Check (P1)

**Files to create/edit:**
- `web-app/src/components/PreCallCheck.tsx` (new)
- `web-app/src/components/ConsultationRoom.tsx`
- `web-app/src/hooks/useConsultationRoom.ts`

**VIDEO-006 — Pre-call device check:**
Insert a `PreCallCheck` step before joining the Daily.co room.
Check: camera (video element preview), microphone (AudioContext analyser), network (ping to `/actuator/health`).

```tsx
export default function PreCallCheck({ onPass, onSkip }) {
  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [networkOk, setNetworkOk] = useState<boolean | null>(null);

  // Run checks on mount using navigator.mediaDevices.getUserMedia
  // Ping /actuator/health for network check
  // All checks done → enable "Join Call" button
}
```

**VIDEO-003 — Audio-only fallback:**
In `useConsultationRoom.ts`, add network quality monitoring:
- On `Daily` network statistics events (`network-quality-change`), track quality score
- If quality score drops to 1/5 for 10+ seconds → surface "Switch to Audio Only" banner
- Audio-only mode: call `frame.updateParticipant('local', { setVideo: false })`
- If audio also fails → set state to `CHAT_FALLBACK` → render chat-only banner

**Acceptance Criteria:**
- [ ] Pre-call check screen shown before joining room
- [ ] Camera, mic, and network checks displayed with pass/fail indicators
- [ ] User can proceed even if checks fail (with warning)
- [ ] Audio-only suggestion surfaces on poor network
- [ ] Fallback chat banner shown if audio also fails

---

## TASK 8 — CONSULT-010: Emergency Escalation Button (P1)

**Files to create/edit:**
- `web-app/src/components/EmergencyButton.tsx` (new)
- `web-app/src/components/ConsultationRoom.tsx`
- `web-app/src/components/ChatPanel.tsx`
- `src/main/java/com/preventia/appointment/controller/AppointmentController.java`

**Backend — `POST /api/v1/appointments/{id}/emergency`:**
```java
@PostMapping("/api/v1/appointments/{id}/emergency")
@PreAuthorize("hasAnyRole('RECIPIENT', 'SPONSOR')")
public ResponseEntity<Void> triggerEmergency(@PathVariable Long id, HttpServletRequest request) {
    Appointment appt = findOrThrow(id);
    // 1. Send urgent Stream message to doctor channel: "⚠️ EMERGENCY ESCALATION — {patientName}"
    // 2. Send FCM high-priority push to doctor (bypass DnD via notification vs data message)
    // 3. Log to appointment_events: EMERGENCY_ESCALATED
    // 4. Email clinic admin via JavaMailSender (async, within 60s)
    // Do NOT require token refresh — use cached token (no new auth check)
}
```

**Frontend — EmergencyButton.tsx:**
```tsx
export default function EmergencyButton({ appointmentId }) {
  const [activated, setActivated] = useState(false);

  const handleEmergency = async () => {
    setActivated(true);
    // Show emergency services guidance immediately
    // Then POST to backend (fire-and-forget — don't block UI)
    fetch(`/api/v1/appointments/${appointmentId}/emergency`, { method: 'POST', ... })
      .catch(console.error); // Don't let network failure block the guidance display
  };

  return activated ? (
    <div style={emergencyStyles.guidance}>
      <h2>🆘 Emergency services: Call 112</h2>
      <p>Your care team has been alerted.</p>
    </div>
  ) : (
    <button onClick={handleEmergency} style={emergencyStyles.btn}>🆘 EMERGENCY</button>
  );
}
```

Mount `EmergencyButton` persistently in `ConsultationRoom` controls bar and in `ChatPanel` header.

**Acceptance Criteria:**
- [ ] Emergency button visible at all times in video call and chat interfaces
- [ ] Tapping shows emergency services guidance (112/911) immediately
- [ ] Doctor receives intrusive push notification (FCM high-priority)
- [ ] Admin email sent within 60s
- [ ] Event logged in appointment events

---

## TASK 9 — CONSULT-006: Video Failure → Chat Fallback (P1)

**Files to edit:**
- `web-app/src/hooks/useConsultationRoom.ts`
- `web-app/src/components/ConsultationRoom.tsx`
- `src/main/java/com/preventia/appointment/controller/AppointmentController.java`

**Fix:**
Track join attempt count. After 3 failures, surface the chat fallback.

```typescript
// In useConsultationRoom.ts
const joinAttempts = useRef(0);
const MAX_JOIN_ATTEMPTS = 3;

const join = useCallback(async () => {
  joinAttempts.current += 1;

  // ... existing join logic ...

  // On error:
  if (joinAttempts.current >= MAX_JOIN_ATTEMPTS) {
    setState(s => ({ ...s, roomStatus: 'CHAT_FALLBACK' }));
    // Notify backend
    putAppointmentState(appointmentId, 'flag-chat-fallback').catch(console.error);
  }
}, [...]);
```

Add `CHAT_FALLBACK` to `RoomStatus` type. In `ConsultationRoom.tsx`, handle this state:
```tsx
{roomStatus === 'CHAT_FALLBACK' && (
  <div style={styles.fallbackBanner}>
    <p>📵 Video unavailable after 3 attempts</p>
    <p>Continue your consultation via chat below.</p>
    <ChatPanel peerUserId={peerUserId} height={400} />
  </div>
)}
```

Add `PUT /api/v1/appointments/{id}/flag-chat-fallback` endpoint — logs `CHAT_FALLBACK` event
and sends doctor a push notification: "Patient {name} is having video issues — switch to chat."

**Acceptance Criteria:**
- [ ] After 3 failed join attempts, chat fallback banner shown automatically
- [ ] Doctor notified via push + chat message
- [ ] CHAT_FALLBACK event logged on appointment
- [ ] Doctor can mark the chat session as the formal consultation for EMR/billing

---

## Commit instructions

After each task, commit with ticket ID:
```bash
git commit -m "feat(sprint-08): {TICKET-ID} {short description}"
git push origin main
```

Final summary commit:
```bash
git commit -m "feat(sprint-08): care communications sprint complete

- CHAT-003: pre-consultation reminder messages (T-24h, T-1h) with scheduler
- CHAT-005: urgent message flag + 4h SLA escalation to admin
- CHAT-006: sponsor-doctor update channel (auto-created on consent GRANTED)
- CHAT-007: pharmacist-doctor prescription clarification channel
- CHAT-010/011: patient and doctor no-show auto-messages
- VIDEO-002: sponsor observer join link sent on ACTIVE
- VIDEO-003/006: pre-call device check + audio-only fallback
- CONSULT-010: emergency escalation button (FCM high-priority + admin email)
- CONSULT-006: video failure auto-escalation to chat fallback"
```
