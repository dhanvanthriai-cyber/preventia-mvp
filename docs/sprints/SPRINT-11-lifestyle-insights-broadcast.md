# SPRINT-11 — Lifestyle Insights Broadcast (Doctor → All Patients)
**Agent:** eng | **Priority:** 🟠 HIGH | **Estimated time:** 5h
**Status:** ⬜ NOT STARTED
**Depends on:** SPRINT-08 ✅ (StreamChatService, ChatNotificationService, PushNotificationService stubs)

---

## PM Analysis & Architecture Decision

### What the feature is

The **POST NEW INSIGHT** card on `DoctorDashboard.tsx` is currently a stub:
- Form collects `category`, `title`, `body`
- Calls `POST /api/v1/insights` — endpoint does **not exist** on the backend
- On failure, falls through to a `console.log` mock and shows a fake success toast

The requirement: when a doctor posts a lifestyle insight, it should be **broadcast as a notification to every patient that doctor is associated with**.

---

## Architecture Analysis — Three Candidate Approaches

### Option A — FCM Topic Per Doctor (Push-Only)
Each patient subscribes to a topic named `doctor-{doctorId}` at login. The backend sends a
Firebase Multicast/Topic message when the doctor posts.

**Pros:** Simple, works cross-platform (web push, Android, iOS), no extra infrastructure.
**Cons:**
- FCM is currently a **stub** — `firebase-admin` SDK is not wired. Requires credential setup.
- Push-only: no in-app feed, no history. Patients who miss the push see nothing.
- Topic subscriptions must be managed on both client and server every time doctor–patient
  relationships change (no centralized source of truth for "who follows Dr. X").
- Not HIPAA-relevant for content (no PHI in insights), but topic names leaking doctor IDs
  could be a privacy concern.
- **Verdict: viable but incomplete** — needs in-app persistence layer on top.

---

### Option B — Stream Chat "Insights" Channel Per Doctor (Persistent Feed)
Create one dedicated Stream channel per doctor: `insights-{doctorId}` with channel type
`livestream`. The doctor (via the bot) posts into it; all current patients are members.
Patients see the feed in their dashboard and get Stream-native push when offline.

**Pros:**
- **Reuses existing Stream infrastructure** — `StreamChatService` + `ChatNotificationService`
  already know how to create/send to channels server-side.
- Stream `livestream` channel type gives **read-only to members** by default (only owners/mods
  can send) — exactly right for a doctor broadcasting to patients.
- Stream delivers its own **push notifications** to offline members via APNs/FCM integration
  — no extra push work needed once Stream keys are live.
- Full message history — patients who open the app later still see all past insights.
- Patients can react (like ♥) to insights natively.
- The existing **LIFESTYLE INSIGHTS feed card** on `DoctorDashboard.tsx` (currently `MOCK_FEED`)
  and the **HEALTH INSIGHTS card** on `PatientDashboard.tsx` both map directly to this channel.

**Cons:**
- Need to manage channel membership: add patients when they book with the doctor, remove (or
  keep read-only) when the relationship ends — but this is a simple hook on appointment events.
- Stream `livestream` channel: all members can read channel by default; only channel creator/
  admin can post. We send via the bot (server-side), which is fine.
- Patients need to be added as members at the Stream level — handled server-side on
  appointment creation/locking (we already do this for the 1:1 channel).

**Verdict: ✅ RECOMMENDED** — fits the existing architecture perfectly.

---

### Option C — Hybrid: Persist to DB + Multicast Push + In-App Feed from API
Store insights in a new `lifestyle_insights` table. On post: send FCM multicast to all patient
tokens. Frontend polls `GET /api/v1/insights?doctorId={id}` for the feed.

**Pros:** No vendor lock-in for the feed. Full analytics on reads/engagement.
**Cons:**
- Requires: DB migration + repository + service + controller + scheduler-less multicast send
- FCM stub needs to be wired (separate credentials work)
- Client-side polling or SSE needed for real-time
- Duplicates what Stream already does better
- **Most work, least leverage**

---

## Chosen Architecture: Option B + DB Persistence Layer

**Best of both worlds:**
1. **Stream `insights-{doctorId}` channel** — real-time delivery, push to offline patients,
   in-app feed, reaction support. Zero extra infra.
2. **`lifestyle_insights` DB table** — source of truth, enables admin analytics, decoupled
   from Stream outages for display, stores rich metadata (category, etc.).

Stream message carries `extraData: { insightId, category }` so the frontend can render
category pills and "like" buttons properly.

---

## Data Model

### Migration: `V23__lifestyle_insights.sql`

```sql
CREATE TABLE lifestyle_insights (
    id              BIGSERIAL       PRIMARY KEY,
    doctor_id       BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category        VARCHAR(50)     NOT NULL DEFAULT 'General',
                                    -- NUTRITION | FITNESS | MENTAL_HEALTH | SLEEP | GENERAL
    title           VARCHAR(255)    NOT NULL,
    body            TEXT            NOT NULL,
    stream_message_id VARCHAR(255),  -- Stream message ID after successful send
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insights_doctor ON lifestyle_insights (doctor_id, created_at DESC);

-- Engagement tracking (future)
CREATE TABLE insight_reactions (
    id              BIGSERIAL   PRIMARY KEY,
    insight_id      BIGINT      NOT NULL REFERENCES lifestyle_insights(id) ON DELETE CASCADE,
    user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction        VARCHAR(20) NOT NULL DEFAULT 'like',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_insight_reaction UNIQUE (insight_id, user_id, reaction)
);
```

---

## Backend Implementation

### 1. Domain + Repository

**`com.preventia.insights.domain.LifestyleInsight`** (JPA entity → `lifestyle_insights`)

**`com.preventia.insights.repository.LifestyleInsightRepository`**
```java
List<LifestyleInsight> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);
```

---

### 2. InsightsBroadcastService

**`com.preventia.insights.service.InsightsBroadcastService`**

Key responsibilities:
1. Save insight to DB
2. Ensure `insights-{doctorId}` Stream channel exists (create if missing)
3. Resolve all unique patient IDs associated with this doctor (via `AppointmentRepository`)
4. Ensure those patients are members of the insights channel
5. Post the insight message as the bot
6. Return saved insight (with stream_message_id populated)

```java
@Service
@Transactional
public class InsightsBroadcastService {

    private final LifestyleInsightRepository insightRepo;
    private final AppointmentRepository appointmentRepo;
    private final InsightsChannelService insightsChannelService;  // Stream ops

    public LifestyleInsight publish(Long doctorId, String doctorName,
                                    String category, String title, String body) {

        // 1. Persist
        LifestyleInsight insight = new LifestyleInsight(doctorId, category, title, body);
        insight = insightRepo.save(insight);

        // 2. Resolve all patients who have ever had an appointment with this doctor
        List<Long> patientIds = appointmentRepo.findByDoctorId(doctorId)
            .stream()
            .map(Appointment::getRecipientId)
            .distinct()
            .collect(Collectors.toList());

        // 3. Ensure channel + membership, then broadcast
        String streamMessageId = insightsChannelService.broadcastInsight(
            doctorId, doctorName, patientIds, insight
        );

        // 4. Store Stream message ID for traceability
        insight.setStreamMessageId(streamMessageId);
        return insightRepo.save(insight);
    }
}
```

---

### 3. InsightsChannelService (Stream operations)

**`com.preventia.insights.service.InsightsChannelService`**

```java
@Service
public class InsightsChannelService {

    private static final String CHANNEL_TYPE = "livestream";
    private static final String BOT_USER_ID  = "preventia-bot";

    // Channel ID: insights-{doctorId}
    // Channel name: "Dr. {doctorName} — Health Insights"
    // Members: [doctorId (str), patientId1, patientId2, ...]
    // Role mapping: doctor = channel_moderator, patients = member (read-only in livestream type)

    public String broadcastInsight(Long doctorId, String doctorName,
                                   List<Long> patientIds, LifestyleInsight insight) {
        if (isStub()) {
            log.info("[InsightsChannel] STUB — would broadcast insightId={}", insight.getId());
            return "stub_msg_" + insight.getId();
        }

        String channelId = "insights-" + doctorId;

        // Upsert channel + members (Stream ignores existing members gracefully)
        ensureChannel(channelId, doctorId, doctorName, patientIds);

        // Post insight as bot
        String text = formatInsightMessage(insight);
        Map<String, Object> extraData = Map.of(
            "insightId", insight.getId(),
            "category",  insight.getCategory(),
            "type",      "lifestyle_insight"
        );
        return sendToChannel(channelId, text, extraData);
    }

    private void ensureChannel(String channelId, Long doctorId,
                                String doctorName, List<Long> patientIds) {
        // Stream REST: POST /channels/livestream/{channelId}
        // body: { "data": { "name": "...", "created_by_id": "preventia-bot",
        //                   "members": [...], "config_overrides": { "read_events": true } },
        //         "add_members": [...patientIds as strings...] }
        //
        // Idempotent: Stream upserts the channel on repeat calls.
        // Members list: include doctorId as moderator + all patientIds as members.
        List<String> memberIds = new ArrayList<>();
        memberIds.add(doctorId.toString());
        patientIds.forEach(id -> memberIds.add(id.toString()));
        memberIds.add(BOT_USER_ID);

        Map<String, Object> channelData = new HashMap<>();
        channelData.put("name", "Dr. " + doctorName + " — Health Insights");
        channelData.put("created_by_id", BOT_USER_ID);

        Map<String, Object> body = new HashMap<>();
        body.put("data", channelData);
        body.put("add_members", memberIds);

        String url = "https://chat.stream-io-api.com/channels/" + CHANNEL_TYPE + "/" + channelId;
        // POST with bot JWT ...
    }

    private String formatInsightMessage(LifestyleInsight insight) {
        String emoji = switch (insight.getCategory().toUpperCase()) {
            case "NUTRITION"     -> "🥗";
            case "FITNESS"       -> "🏃";
            case "MENTAL_HEALTH" -> "🧘";
            case "SLEEP"         -> "😴";
            default              -> "💡";
        };
        return emoji + " " + insight.getTitle() + "\n\n" + insight.getBody();
    }
}
```

---

### 4. InsightsController

**`com.preventia.insights.controller.InsightsController`**

```java
@RestController
@RequestMapping("/api/v1/insights")
public class InsightsController {

    private final InsightsBroadcastService broadcastService;
    private final LifestyleInsightRepository insightRepo;

    // Doctor posts a new insight — broadcasts to all associated patients
    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<InsightResponse> postInsight(
            @RequestBody @Valid InsightRequest req,
            Authentication auth) {

        Long doctorId   = extractUserId(auth);
        String doctorName = extractUserName(auth);

        LifestyleInsight saved = broadcastService.publish(
            doctorId, doctorName, req.category(), req.title(), req.body()
        );
        return ResponseEntity.ok(InsightResponse.from(saved));
    }

    // Patient fetches insights from all their doctors
    @GetMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'RECIPIENT')")
    public ResponseEntity<List<InsightResponse>> getInsights(Authentication auth) {
        // For DOCTOR: return own posted insights
        // For RECIPIENT: return insights from doctors they've consulted
        // ...
    }

    // Stream channel token for the patient to connect to insights-{doctorId} channel
    @GetMapping("/channel-token/{doctorId}")
    @PreAuthorize("hasRole('RECIPIENT')")
    public ResponseEntity<InsightsChannelTokenResponse> getChannelToken(
            @PathVariable Long doctorId, Authentication auth) {
        // Returns Stream token + channelId so frontend can subscribe
    }
}
```

---

### 5. New Patient Auto-Enroll Hook

When a new appointment is created (`AppointmentService.createAppointment()`), add the patient
to their doctor's insights channel so they start receiving future posts immediately.

```java
// In AppointmentService.createAppointment() — after appointment is saved:
insightsChannelService.addPatientToInsightsChannel(
    appointmentRequest.getDoctorId(),
    appointmentRequest.getRecipientId()
);
```

`InsightsChannelService.addPatientToInsightsChannel()` — upserts the patient as a channel member.
No-ops gracefully if the channel doesn't exist yet (doctor hasn't posted any insights).

---

## Frontend Implementation

### DoctorDashboard.tsx — Wire POST /api/v1/insights (already calls it, just no backend)

The existing `handlePostInsight()` already POSTs to `/api/v1/insights`. Once the backend exists,
remove the mock fallback paths:

```tsx
const handlePostInsight = async () => {
  setInsightLoading(true);
  try {
    const res = await fetch('/api/v1/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: insightCategory, title: insightTitle, body: insightBody }),
    });
    if (!res.ok) throw new Error('Failed to post insight');
    setInsightSuccess(true);
    setInsightTitle('');
    setInsightBody('');
    // Reload feed
    await loadInsights();
  } catch (err) {
    setInsightError('Could not post insight. Please try again.');
  } finally {
    setInsightLoading(false);
    setTimeout(() => setInsightSuccess(false), 4000);
  }
};
```

Add a `loadInsights()` function that calls `GET /api/v1/insights` and replaces `MOCK_FEED`.

**LIFESTYLE INSIGHTS feed card** (currently shows `MOCK_FEED`):
- Replace static array with real API data from `GET /api/v1/insights`
- Each card: category pill + title + body + relative timestamp + LIKE button
- LIKE button calls `POST /api/v1/insights/{id}/react`

---

### PatientDashboard.tsx — HEALTH INSIGHTS card

The existing card shows a single hardcoded article. Replace with:
- Call `GET /api/v1/insights` → returns insights from all the patient's doctors
- Show latest 3 with category, title, doctor name, relative date
- "VIEW ALL" links to `/patient/insights` (new page, similar to PatientNewsPage.tsx)

---

### PatientInsightsPage.tsx (new, similar to PatientNewsPage)

Full feed of all insights from all doctors the patient has consulted.
- Column layout: category pill, title, body, doctor name + date
- LIKE ♥ button (calls `POST /api/v1/insights/{id}/react`)

---

## Notification Flow (End-to-End)

```
Doctor fills form → POST /api/v1/insights
  → InsightsBroadcastService.publish()
    → Save to lifestyle_insights table
    → InsightsChannelService.broadcastInsight()
      → Upsert Stream "insights-{doctorId}" (livestream type)
      → Add all patient IDs as members (idempotent)
      → POST message via bot with extraData {insightId, category}
        → Stream delivers to all online patients (WebSocket)
        → Stream sends APNs/FCM push to offline patients ← zero extra work
  → Return InsightResponse to doctor UI
    → Doctor sees "Insight posted!" toast + feed refreshes
```

Patient experience:
- **Online:** New message appears live in the channel, banner notification in-app
- **Offline mobile:** FCM/APNs push: "Dr. Kumar shared a new health insight"
- **Opens app later:** Insight is in the feed history (full persistence)

---

## Acceptance Criteria

- [ ] `POST /api/v1/insights` saves insight to DB and broadcasts to Stream channel
- [ ] Stream `insights-{doctorId}` channel auto-created on first post (idempotent)
- [ ] All patients who have had at least one appointment with the doctor are channel members
- [ ] New appointments automatically enroll the patient in the doctor's insights channel
- [ ] Doctor sees real insights feed (not MOCK_FEED) on DoctorDashboard
- [ ] Patient sees doctor insights on PatientDashboard HEALTH INSIGHTS card
- [ ] `GET /api/v1/insights` returns filtered list (doctor: own posts; patient: from their doctors)
- [ ] Patients who are offline receive Stream's native push notification (once FCM keys are live)
- [ ] Stub mode: when `STREAM_API_KEY=STUB_KEY`, service logs but does not fail; frontend shows toast
- [ ] LIKE reaction stored in `insight_reactions` table via `POST /api/v1/insights/{id}/react`

---

## Files to Create

| File | Purpose |
|---|---|
| `eng/src/.../insights/domain/LifestyleInsight.java` | JPA entity |
| `eng/src/.../insights/domain/InsightReaction.java` | Reaction entity |
| `eng/src/.../insights/repository/LifestyleInsightRepository.java` | Spring Data repo |
| `eng/src/.../insights/repository/InsightReactionRepository.java` | Reaction repo |
| `eng/src/.../insights/service/InsightsBroadcastService.java` | Orchestrator |
| `eng/src/.../insights/service/InsightsChannelService.java` | Stream channel ops |
| `eng/src/.../insights/controller/InsightsController.java` | REST API |
| `eng/src/.../insights/dto/InsightRequest.java` | Request DTO |
| `eng/src/.../insights/dto/InsightResponse.java` | Response DTO |
| `eng/src/main/resources/db/migration/V23__lifestyle_insights.sql` | DB migration |
| `eng/web-app/src/components/PatientInsightsPage.tsx` | Patient full feed page |

## Files to Modify

| File | Change |
|---|---|
| `eng/web-app/src/components/DoctorDashboard.tsx` | Wire real API, replace MOCK_FEED |
| `eng/web-app/src/components/PatientDashboard.tsx` | Wire HEALTH INSIGHTS card to real API |
| `eng/src/.../appointment/service/AppointmentService.java` | Auto-enroll patient in insights channel |

---

## Final Commit

```bash
git commit -m "feat(sprint-11): lifestyle insights broadcast — doctor → all patients

- POST /api/v1/insights: saves insight, broadcasts to Stream insights-{doctorId} channel
- Stream livestream channel per doctor: patients read-only, Stream handles push
- V23 migration: lifestyle_insights + insight_reactions tables
- Doctor dashboard: LIFESTYLE INSIGHTS feed wired to real API (replaces MOCK_FEED)
- Patient dashboard: HEALTH INSIGHTS card wired to real doctor insights
- PatientInsightsPage: full insights feed from all patient's doctors
- Auto-enroll: new appointment hooks add patient to doctor's insights channel"
git push origin main
```
