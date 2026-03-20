# SPRINT-10 — Polish, Intelligence & Advanced Flows (P2 + P3)
**Agent:** eng | **Priority:** 🟡 MEDIUM → 🟢 FUTURE | **Estimated time:** 6h
**Status:** ⬜ NOT STARTED
**Depends on:** SPRINT-09 ✅

---

## Context

Final sprint in the chat/video series. Covers unified views, advanced multi-party flows,
and future-facing features. Lower urgency — deliver after core care flows are stable.
All files live in `/home/ubuntu/.openclaw/workspace/eng/`.

---

## TASK 1 — CHAT-014: Multi-Party Care Team Group Channel (P2)

**Files to edit:**
- `src/main/java/com/preventia/family/service/FamilyService.java`
- `src/main/java/com/preventia/chat/service/ChatNotificationService.java`

**Fix:**
Create a 3-way group channel (doctor + patient + sponsor) when a sponsor is linked.
This is separate from the private 1:1 channels.

```java
// In FamilyService.grantConsent() — after consent = GRANTED:
chatNotificationService.createCareTeamChannel(
    sponsorId, recipientId, doctorId,
    sponsorName, patientName, doctorName
);
```

`ChatNotificationService.createCareTeamChannel()`:
- Stream channel type: `messaging`
- Channel ID: `care-team-{recipientId}` (deterministic, one per patient)
- Members: `[sponsorId, recipientId, doctorId]`
- Channel name: "Care Team — {patientName}"
- Initial message: "Welcome to your care team channel. Doctor, patient, and sponsor can communicate here."

Backend `PUT /api/v1/chat/care-team/{channelId}/permissions`:
- Doctor can toggle sponsor to read-only (revoke `send-message` capability for sponsor)
- Uses Stream's channel member update API

**Acceptance Criteria:**
- [ ] Care Team channel auto-created on sponsor consent GRANTED
- [ ] All three parties receive messages and attachments
- [ ] Doctor can set sponsor to read-only mode
- [ ] Channel has a distinct name separate from 1:1 channels

---

## TASK 2 — CONSULT-001: Unified Consultation Timeline View (P2)

**Files to create/edit:**
- `src/main/java/com/preventia/clinical/controller/ClinicalController.java`
- `web-app/src/components/PatientTimeline.tsx` (new)

**Backend — `GET /api/v1/patients/{id}/timeline`:**

```java
@GetMapping("/api/v1/patients/{id}/timeline")
@PreAuthorize("hasAnyRole('DOCTOR', 'RECIPIENT', 'SPONSOR')")
public ResponseEntity<List<TimelineEvent>> getTimeline(
        @PathVariable Long id, Authentication auth) {

    // Role-filter: RECIPIENT sees own timeline; DOCTOR sees full; SPONSOR sees filtered
    // Aggregate from:
    //   - appointments (LOCKED only — completed sessions)
    //   - soap_notes (plan + assessment fields only for patient view)
    //   - lab_orders (status=RESULTED)
    //   - prescription_audit_log (action=DISPATCHED)
    // Sort by created_at DESC

    return ResponseEntity.ok(timelineService.buildTimeline(id, callerRole));
}
```

Response shape:
```json
[
  { "type": "APPOINTMENT", "date": "...", "title": "Consultation with Dr. X", "summary": "...", "appointmentId": 42 },
  { "type": "LAB_RESULT",  "date": "...", "title": "Blood Panel Results", "signedUrl": "..." },
  { "type": "PRESCRIPTION","date": "...", "title": "Prescription Dispensed", "pharmacy": "..." }
]
```

**Frontend — PatientTimeline.tsx:**
- Vertical timeline card list
- Each card type has a distinct icon and color
- Doctor view includes "View SOAP Note" CTA on APPOINTMENT cards
- Accessible from doctor dashboard → Patient detail page and patient dashboard

**Acceptance Criteria:**
- [ ] Timeline aggregates appointments, labs, prescriptions in one chronological view
- [ ] Role-filtered: SOAP internals hidden from patient and sponsor
- [ ] Doctor can flag chat messages as "clinically relevant" to surface them in timeline
- [ ] Timeline available on web (mobile deferred)

---

## TASK 3 — VIDEO-004: Post-Call Transcript & Recording (P2)

**Files to edit:**
- `src/main/java/com/preventia/appointment/service/DailyRoomService.java`
- `src/main/java/com/preventia/appointment/controller/DailyWebhookController.java`

**Fix:**
Enable Daily.co cloud recording when consent is given (consent_records.recording_consent = true).

In `DailyRoomService.createRoom()`:
```java
// Check consent before enabling recording
if (recordingConsented) {
    properties.put("enable_recording", "cloud");
}
```

In `DailyWebhookController`, handle `recording-ready` webhook action:
```java
case "recording-ready" -> {
    String recordingUrl = extractRecordingUrl(payload);
    String roomName = extractRoomName(payload);
    appointmentRepository.findByDailyRoomName(roomName).ifPresent(appt -> {
        // Store recording URL in appointment_transcripts table
        transcriptRepository.save(new AppointmentTranscript(
            appt.getId(), recordingUrl, Instant.now()
        ));
        // Send chat message to doctor: "Recording ready: {link}"
        chatNotificationService.sendRecordingReady(appt.getDoctorId(), appt.getId(), recordingUrl);
    });
}
```

Add `V19__appointment_transcripts.sql`:
```sql
CREATE TABLE appointment_transcripts (
    id              BIGSERIAL   PRIMARY KEY,
    appointment_id  BIGINT      NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
    recording_url   TEXT,
    transcript_text TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Acceptance Criteria:**
- [ ] Recording enabled on room creation only if consent.recording_consent = true
- [ ] `recording-ready` webhook stores URL in `appointment_transcripts`
- [ ] Doctor receives chat message with recording link
- [ ] Transcript not shared with patient by default

---

## TASK 4 — CONSULT-007: Recurring Care Plan Check-In Messages (P2)

**Files to create:**
- `src/main/java/com/preventia/care/domain/CarePlan.java`
- `src/main/java/com/preventia/care/service/CarePlanService.java`
- `src/main/java/com/preventia/care/scheduler/CarePlanCheckinScheduler.java`
- `src/main/java/com/preventia/care/controller/CarePlanController.java`

**Database — `V20__care_plans.sql`:**
```sql
CREATE TABLE care_plans (
    id              BIGSERIAL       PRIMARY KEY,
    patient_id      BIGINT          NOT NULL REFERENCES users(id),
    doctor_id       BIGINT          NOT NULL REFERENCES users(id),
    appointment_id  BIGINT          REFERENCES appointments(id),
    question        TEXT            NOT NULL,
    frequency       VARCHAR(20)     NOT NULL DEFAULT 'WEEKLY', -- DAILY | WEEKLY | MONTHLY
    next_send_at    TIMESTAMPTZ     NOT NULL,
    active          BOOLEAN         NOT NULL DEFAULT TRUE,
    missed_count    INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE care_plan_responses (
    id              BIGSERIAL   PRIMARY KEY,
    care_plan_id    BIGINT      NOT NULL REFERENCES care_plans(id),
    response_text   TEXT,
    stream_message_id VARCHAR(255),
    responded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`CarePlanCheckinScheduler` runs every hour:
- Find care plans where `next_send_at <= now()` and `active = true`
- Send question as Stream chat message with `extraData: { type: "checkin", carePlanId }`
- Update `next_send_at` based on frequency
- If `missed_count >= 3` → alert doctor

**API:**
- `POST /api/v1/care-plans` — doctor creates a care plan
- `GET /api/v1/care-plans?patientId={id}` — doctor views check-in history
- `DELETE /api/v1/care-plans/{id}` — deactivate

**Acceptance Criteria:**
- [ ] Doctor creates care plan questions from doctor dashboard
- [ ] Questions sent on schedule (daily/weekly/monthly)
- [ ] Patient replies in chat; responses stored in `care_plan_responses`
- [ ] Doctor alerted after 3 consecutive missed check-ins

---

## TASK 5 — CONSULT-009: Post-Consultation Satisfaction Survey (P2)

**Files to create/edit:**
- `src/main/java/com/preventia/ops/scheduler/SatisfactionSurveyScheduler.java` (new)
- `src/main/java/com/preventia/chat/service/ChatNotificationService.java`

**Database — `V21__consultation_feedback.sql`:**
```sql
CREATE TABLE consultation_feedback (
    id              BIGSERIAL   PRIMARY KEY,
    appointment_id  BIGINT      NOT NULL REFERENCES appointments(id),
    user_id         BIGINT      NOT NULL REFERENCES users(id),
    rating          INT         CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_feedback_appt_user UNIQUE (appointment_id, user_id)
);
```

`SatisfactionSurveyScheduler` runs every 10 minutes:
- Find appointments that reached `LOCKED` status 30+ minutes ago
- Check `consultation_feedback` — if no row for this patient → send survey
- Same for sponsor

Survey message:
```
⭐ How was your consultation?
Please rate your experience with Dr. {doctorName}:
[1] [2] [3] [4] [5]
(Optional: type a comment below)
```

Message extraData: `{ type: "survey", appointmentId }`
Custom message renderer shows star buttons. Selection POSTs to `POST /api/v1/feedback/consultation`.

**Acceptance Criteria:**
- [ ] Survey sent 30 min after LOCKED — once per patient per appointment
- [ ] Star rating interactive in both web and mobile (custom renderer)
- [ ] Results stored in `consultation_feedback`
- [ ] Admin dashboard reads aggregate ratings (future: analytics)

---

## TASK 6 — CONSULT-008: Second Opinion Request (P3)

**Files to create/edit:**
- `src/main/java/com/preventia/clinical/controller/ClinicalController.java`
- `web-app/src/components/DoctorDashboard.tsx`

**Fix:**
Add `POST /api/v1/patients/{id}/request-second-opinion`:
```java
@PostMapping("/api/v1/patients/{id}/request-second-opinion")
@PreAuthorize("hasRole('DOCTOR')")
public ResponseEntity<Void> requestSecondOpinion(
        @PathVariable Long id,          // patientId
        @RequestBody Map<String, Long> body) {

    Long specialistId = body.get("specialistId");
    // Add specialist to the Care Team channel as a member
    // Share last SOAP note (plan + assessment only) with specialist via chat
    // Log: appointment_events → SECOND_OPINION_REQUESTED
}
```

Doctor dashboard: "Invite Specialist" button on patient profile page.
Specialist user search: `GET /api/v1/users?role=DOCTOR` filtered by specialty (future field).

**Acceptance Criteria:**
- [ ] Primary doctor can invite a specialist to the care team channel
- [ ] Specialist sees a curated summary (no full SOAP internals)
- [ ] Specialist can reply in channel or propose a new appointment
- [ ] Event logged as SECOND_OPINION_REQUESTED

---

## Final commit

```bash
git commit -m "feat(sprint-10): polish, intelligence & advanced flows complete

- CHAT-014: multi-party care team group channel (doctor+patient+sponsor)
- CONSULT-001: unified consultation timeline view (appointments+labs+prescriptions)
- VIDEO-004: post-call recording + transcript storage (consent-gated)
- CONSULT-007: recurring care plan check-in messages with missed-check alert
- CONSULT-009: post-consultation satisfaction survey (30min after LOCKED)
- CONSULT-008: second opinion flow — specialist invited to care team channel (P3)"
git push origin main
```
