# SPRINT-09 — Clinical Handoff & Async Care (P1 Remainder + P2 Wave 1)
**Agent:** eng | **Priority:** 🟠 HIGH → 🟡 MEDIUM | **Estimated time:** 7h
**Status:** ⬜ NOT STARTED
**Depends on:** SPRINT-08 ✅ (ChatNotificationService, sponsor channels, reminder scheduler)

---

## Context

This sprint closes out the remaining P1 tickets and starts the P2 wave.
Focus is on the post-consultation clinical handoff and async care flows.
All files live in `/home/ubuntu/.openclaw/workspace/eng/`.

---

## TASK 1 — CHAT-004: Patient Symptom Update with Image Attachments (P1)

**Files to edit:**
- `web-app/src/components/ChatPanel.tsx`
- `web-app/src/components/PatientDashboard.tsx`

**Fix:**
Stream Chat natively supports file/image attachments — enable them on the patient channel.

In `ChatPanel.tsx`, configure the Stream channel to allow file uploads:
```tsx
// Set channel capabilities to allow attachments
const channelOptions = {
  acceptedFiles: ['image/*', 'application/pdf'],
  maxNumberOfFiles: 5,
};

// Add AttachmentPreviewList to the MessageInput
<MessageInput
  focus={!!activeChannel}
  additionalTextareaProps={{ placeholder: 'Describe your symptoms or attach a photo…' }}
/>
```

No backend changes needed — Stream handles CDN storage.
Confirm in Stream dashboard: App Settings → Channel Types → messaging → File Uploads = enabled.

Add an unread badge count on the doctor dashboard:
- `ChannelList` already provides unread counts via `channel.state.unreadCount`
- Surface this as a red badge on the "Messages" tab/section header

**Acceptance Criteria:**
- [ ] Patient can type and send messages at any time (async, between appointments)
- [ ] Images and PDFs attachable (up to 10 MB per file, max 5 per message)
- [ ] Doctor sees unread badge on their messages section
- [ ] Doctor push notification on new patient message

---

## TASK 2 — CHAT-008: Lab Results Notification to Patient (P1)

**Files to create/edit:**
- `src/main/java/com/preventia/clinical/controller/ClinicalController.java`
- `src/main/java/com/preventia/chat/service/ChatNotificationService.java`

**Fix:**
Add `POST /api/v1/lab-orders/{orderId}/notify-patient`:

```java
@PostMapping("/api/v1/lab-orders/{orderId}/notify-patient")
@PreAuthorize("hasRole('DOCTOR')")
public ResponseEntity<Void> notifyLabResult(
        @PathVariable Long orderId,
        @RequestBody Map<String, String> body,
        Authentication auth) {

    LabOrder order = labOrderRepository.findById(orderId)
        .orElseThrow(() -> new EntityNotFoundException("Lab order not found"));

    String doctorNote = body.getOrDefault("doctorNote", "");

    // Generate 24h signed URL for the result PDF
    String signedUrl = storageService.generatePresignedUrl(order.getResultPdfKey(), Duration.ofHours(24));

    // Send chat message to patient channel
    chatNotificationService.sendLabResultNotification(
        order.getPatientId(), order.getAppointmentId(),
        order.getTestName(), doctorNote, signedUrl
    );

    return ResponseEntity.ok().build();
}
```

`ChatNotificationService.sendLabResultNotification()` sends:
```
🧪 Your lab results are ready!

Test: {testName}
Doctor's note: {doctorNote}

View your report (link expires in 24 hours):
{signedUrl}

Reply if you have any questions.
```

Tag the message: `extraData: { type: "lab_result", orderId, expiresAt }`

**Acceptance Criteria:**
- [ ] Doctor triggers notification with optional note from doctor dashboard
- [ ] Patient receives chat message with 24h signed PDF link
- [ ] Patient push notification fires
- [ ] Link expiry enforced at storage layer

---

## TASK 3 — CHAT-009: Consent Document Delivery via Chat (P1)

**Files to create/edit:**
- `src/main/java/com/preventia/consent/controller/ConsentController.java`
- `web-app/src/components/ChatPanel.tsx`

**Fix:**
Add an interactive consent message that patients can respond to in-chat.

Backend: `POST /api/v1/consent/send-to-chat`:
```java
@PostMapping("/api/v1/consent/send-to-chat")
@PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
public ResponseEntity<Void> sendConsentToChat(
        @RequestBody Map<String, Object> body) {
    Long patientId = Long.parseLong(body.get("patientId").toString());
    String consentType = body.getOrDefault("consentType", "GENERAL").toString();

    // Send Stream message with extraData.type = "consent_request"
    // Message includes consent text + action buttons
    chatNotificationService.sendConsentRequest(patientId, consentType);
    return ResponseEntity.ok().build();
}
```

Frontend: Custom message renderer for `type = "consent_request"`:
```tsx
const ConsentMessageRenderer = ({ message }) => {
  if (message.extraData?.type !== 'consent_request') return <MessageSimple {...} />;

  const [signed, setSigned] = useState(!!message.extraData?.signedAt);

  const handleSign = async () => {
    await fetch('/api/v1/consent/acknowledge', {
      method: 'POST',
      body: JSON.stringify({ messageId: message.id, consentType: message.extraData.consentType }),
      ...
    });
    setSigned(true);
  };

  return (
    <div style={styles.consentCard}>
      <p>{message.text}</p>
      {signed
        ? <span>✅ Signed at {message.extraData.signedAt}</span>
        : <button onClick={handleSign}>I Agree</button>
      }
    </div>
  );
};
```

Add `POST /api/v1/consent/acknowledge` — stores record in `consent_records`, updates Stream message extraData via `updateMessage` API.

**Acceptance Criteria:**
- [ ] Consent document sent as interactive chat message with "I Agree" button
- [ ] Patient acknowledges in chat; `consent_records` row created with timestamp
- [ ] Message updates to show "✅ Signed by {name}" after acknowledgement
- [ ] Sponsor can countersign (same flow, different channel)

---

## TASK 4 — CHAT-012: Post-Consultation SOAP Summary to Patient (P1)

**Files to edit:**
- `src/main/java/com/preventia/clinical/controller/ClinicalController.java`
- `src/main/java/com/preventia/chat/service/ChatNotificationService.java`

**Fix:**
Add `POST /api/v1/appointments/{id}/share-summary`:

```java
@PostMapping("/api/v1/appointments/{id}/share-summary")
@PreAuthorize("hasRole('DOCTOR')")
public ResponseEntity<Void> shareConsultationSummary(
        @PathVariable Long id,
        @RequestBody Map<String, String> body,
        Authentication auth) {

    Appointment appt = findOrThrow(id);
    if (appt.getStatus() != AppointmentStatus.LOCKED) {
        return ResponseEntity.badRequest().build(); // Only share after lock
    }

    // Fetch the SOAP note for this appointment
    SoapNote note = soapNoteRepository.findByAppointmentId(id)
        .orElseThrow(() -> new EntityNotFoundException("SOAP note not found"));

    // Doctor provides a patient-friendly override, or we use the PLAN field
    String summary = body.getOrDefault("summary", note.getPlan());

    chatNotificationService.sendConsultationSummary(
        appt.getRecipientId(), appt.getDoctorId(), appt.getId(), summary
    );

    // Also send to sponsor channel if linked
    if (appt.getSponsorId() != null) {
        chatNotificationService.sendToSponsorChannel(appt.getSponsorId(), appt.getDoctorId(),
            "Post-consultation summary for " + appt.getRecipientId() + ":\n\n" + summary);
    }

    return ResponseEntity.ok().build();
}
```

Message sent to patient:
```
📋 Your consultation summary

👨‍⚕️ Dr. {doctorName}  |  {date} IST

{summary}

Questions? Reply here or book a follow-up in the portal.
```

Tag: `extraData: { type: "soap_summary", appointmentId }`

**Acceptance Criteria:**
- [ ] Only callable after appointment is LOCKED
- [ ] Doctor can provide a custom plain-text summary (overrides raw PLAN field)
- [ ] Patient receives it as a structured chat card
- [ ] Sponsor receives a copy on their channel

---

## TASK 5 — CONSULT-002: Prescription Notification + Pharmacy Routing (P1)

**Files to edit:**
- `src/main/java/com/preventia/clinical/controller/PrescriptionController.java`
- `src/main/java/com/preventia/chat/service/ChatNotificationService.java`

**Fix:**
Add pharmacy routing flow triggered after prescription approval.

Trigger in `PrescriptionController` when `prescription_status` transitions to `APPROVED`:
```java
// After prescription approval:
chatNotificationService.sendPrescriptionReady(
    soapNote.getPatientId(), soapNote.getDoctorId(),
    soapNote.getId(), prescriptionS3SignedUrl
);
```

`ChatNotificationService.sendPrescriptionReady()` sends:
```
💊 Your prescription is ready!

Dr. {doctorName} has approved your prescription.
View prescription: {signedUrl} (expires in 48h)

Would you like to route this to a pharmacy?
[Route to My Pharmacy] [I'll Handle It]
```

Message extraData: `{ type: "prescription_ready", soapNoteId, actionRequired: true }`

Frontend: Custom renderer for `type = "prescription_ready"`:
- "Route to My Pharmacy" button → `POST /api/v1/prescriptions/{id}/route-to-pharmacy`
- "I'll Handle It" → dismisses the action state

Sponsor channel also receives: "💊 Dr. {name} has issued a prescription for {patientName}. It has been sent to the pharmacy."

**Acceptance Criteria:**
- [ ] Patient receives prescription notification in chat after pharmacist approval
- [ ] One-tap pharmacy routing available directly from the chat message
- [ ] Sponsor notified on their channel
- [ ] Prescription PDF link is time-limited (48h signed URL)

---

## TASK 6 — CONSULT-003: SOAP Note Pre-Population from Chat Context (P1)

**Files to create/edit:**
- `src/main/java/com/preventia/clinical/controller/ClinicalController.java`
- `web-app/src/components/SoapNoteEditor.tsx` (if exists, else create)

**Fix:**
Add `GET /api/v1/appointments/{id}/soap-prefill`:

```java
@GetMapping("/api/v1/appointments/{id}/soap-prefill")
@PreAuthorize("hasRole('DOCTOR')")
public ResponseEntity<SoapPrefillResponse> getSoapPrefill(@PathVariable Long id) {
    Appointment appt = findOrThrow(id);

    // 1. Fetch last 3 patient messages from Stream channel
    //    (messages where userId == recipientId, last 3 before appointment start_time)
    //    Use Stream server API: GET /channels/messaging/{channelId}/messages?user_id={recipientId}&limit=3
    List<String> patientMessages = streamChatService.getRecentPatientMessages(
        appt.getDoctorId(), appt.getRecipientId(), appt.getStartTime(), 3
    );

    // 2. Fetch messages flagged during the call (extraData.flagged=true, from in-call channel)
    List<String> flaggedMessages = streamChatService.getFlaggedInCallMessages(
        appt.getDoctorId(), appt.getRecipientId(), appt.getId()
    );

    return ResponseEntity.ok(new SoapPrefillResponse(patientMessages, flaggedMessages));
}
```

In the SOAP editor frontend, call this endpoint when the editor opens post-consultation:
```tsx
// SoapNoteEditor.tsx
useEffect(() => {
  fetch(`/api/v1/appointments/${appointmentId}/soap-prefill`, authHeaders())
    .then(r => r.json())
    .then(prefill => {
      // Pre-fill the subjective field with patient messages
      setSubjective(prefill.patientMessages.join('\n') + '\n\n[Edit above — pre-filled from patient chat]');
      // Pre-fill objective with flagged in-call messages if any
      if (prefill.flaggedMessages.length > 0) {
        setObjective(prefill.flaggedMessages.join('\n') + '\n\n[From in-call notes]');
      }
    });
}, [appointmentId]);
```

**Acceptance Criteria:**
- [ ] SOAP editor opens with `subjective` pre-filled from patient's last 3 async messages
- [ ] In-call flagged messages appear in `objective` field
- [ ] Pre-filled content is clearly marked "from patient chat" (not raw)
- [ ] Doctor can freely edit or delete any pre-filled content
- [ ] SOAP note still only writable while status is COMPLETED (before LOCKED)

---

## TASK 7 — CONSULT-005: Sponsor Live Updates During Consultation (P2)

**Files to edit:**
- `web-app/src/components/ConsultationRoom.tsx`
- `src/main/java/com/preventia/chat/controller/ChatController.java`

**Fix:**
Add a quick-message panel in the video call sidebar for doctors.

Backend: `POST /api/v1/chat/live-update/{appointmentId}`:
```java
@PostMapping("/api/v1/chat/live-update/{appointmentId}")
@PreAuthorize("hasRole('DOCTOR')")
public ResponseEntity<Void> sendLiveUpdate(
        @PathVariable Long appointmentId,
        @RequestBody Map<String, String> body) {
    // Send to sponsor-doctor channel
    // Message extraData: { liveUpdate: true, appointmentId }
    // Sponsor channel shows 🔴 LIVE badge while appointment is ACTIVE
}
```

Frontend: In `ConsultationRoom.tsx`, add a collapsible "Live Updates to Sponsor" panel:
```tsx
const QUICK_TEMPLATES = [
  "Examination started",
  "Taking medical history",
  "Reviewing medications",
  "Prescribing medication",
  "Follow-up needed",
  "Consultation complete",
];

{roomStatus === 'ACTIVE' && sponsorLinked && (
  <div style={styles.liveUpdatePanel}>
    <p style={styles.liveLabel}>🔴 Live updates to sponsor</p>
    {QUICK_TEMPLATES.map(t => (
      <button key={t} onClick={() => sendLiveUpdate(t)} style={styles.quickBtn}>{t}</button>
    ))}
    <input placeholder="Custom update…" onKeyDown={handleCustomUpdate} />
  </div>
)}
```

**Acceptance Criteria:**
- [ ] Doctor sees live update panel when consultation is ACTIVE and sponsor is linked
- [ ] Quick-reply templates allow one-tap updates
- [ ] Custom text field for freeform updates
- [ ] Sponsor channel shows 🔴 LIVE badge when appointment is ACTIVE
- [ ] Messages tagged with `{ liveUpdate: true }` for UI differentiation

---

## TASK 8 — CHAT-013: Follow-up Appointment Scheduling via Chat (P2)

**Files to edit:**
- `src/main/java/com/preventia/appointment/controller/AppointmentController.java`
- `web-app/src/components/ChatPanel.tsx`

**Fix:**
Add `POST /api/v1/appointments/propose` — creates a `SCHEDULED` appointment from a chat action:
```java
@PostMapping("/api/v1/appointments/propose")
@PreAuthorize("hasRole('DOCTOR')")
public ResponseEntity<AppointmentResponse> proposeFollowUp(@RequestBody CreateAppointmentRequest request) {
    // Same as createAppointment but marks parentAppointmentId if provided
    // Sends booking card to patient channel via ChatNotificationService
}
```

In `ChatPanel.tsx`, doctor side: add a "Schedule Follow-up" button in the compose bar.
On click, opens a date/time picker. On submit, posts to `/appointments/propose`.
Patient receives a chat card with "Accept" and "Propose Another Time" buttons.

**Acceptance Criteria:**
- [ ] Doctor can propose follow-up from the chat interface
- [ ] Patient receives a booking card with Accept/Reschedule CTAs
- [ ] Accepting creates the appointment and sends a confirmation message
- [ ] New appointment linked to parent via `parentAppointmentId`

---

## Commit instructions

```bash
git commit -m "feat(sprint-09): clinical handoff & async care sprint complete

- CHAT-004: patient symptom updates + image attachments + unread badges
- CHAT-008: lab results notification with 24h signed PDF URL
- CHAT-009: consent document delivery via interactive chat message
- CHAT-012: post-consultation SOAP summary shared to patient + sponsor
- CONSULT-002: prescription notification with one-tap pharmacy routing
- CONSULT-003: SOAP pre-population from patient chat + in-call flagged messages
- CONSULT-005: sponsor live update panel during active consultation
- CHAT-013: follow-up appointment scheduling from chat (P2)"
git push origin main
```
