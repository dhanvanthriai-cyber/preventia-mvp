# Preventia — Agent Directives (Heavy Hitters First)
**Copy these prompts exactly into each openclaw agent chat**

---

## 🔴 DIRECTIVE 1 — eng agent
### Task: Fix Video Rendering + Auth Guards + Token Refresh
*Highest impact. Unblocks ALL testing. ~2.5 agent hours*

---

```
You are a Principal Software Engineer (see SOUL.md). We are working on Project Preventia — a high-trust NRI healthcare platform.

Current state:
- Backend: Spring Boot 3.x running on Podman at http://localhost:8080 (health: UP)
- Web: Next.js 14 at eng/web-app/
- Mobile: Expo RN 50 at eng/mobile-app/
- Shared lib: eng/shared/ (@preventia/shared)

You have 3 tasks to complete in this session. Do them in order. Commit after each one.

---

TASK 1: Fix Daily.co video tile rendering in ConsultationRoom (web)
File: eng/web-app/src/components/ConsultationRoom.tsx
File: eng/web-app/src/hooks/useConsultationRoom.ts

Problem: callObject is created via Daily.createCallObject() but never attached to the DOM div. The frameRef div exists but video never renders.

Fix:
- In useConsultationRoom.ts, after createCallObject(), call callObject.startCamera() to initialize media devices
- In ConsultationRoom.tsx, when roomStatus transitions to ACTIVE, call callObject.setInputDevicesAsync() and attach the call iframe to frameRef.current using Daily.createFrame(frameRef.current, { url: roomUrl, token: doctorToken, showLeaveButton: false, showFullscreenButton: true })
- Handle the case where Daily.createFrame is already called (guard with a ref flag to prevent double-init)
- When roomStatus === LOCKED or leave() is called, destroy the frame with frameRef.current?.querySelector('iframe')?.remove()
- Add error handling for camera/mic permission denial (show a styled error banner using existing styles.errorBanner)

After fix, the video area must render the Daily.co iframe when status is ACTIVE.

---

TASK 2: Add Next.js auth middleware + login page (web)
Files to create:
- eng/web-app/src/middleware.ts
- eng/web-app/src/app/login/page.tsx
- eng/web-app/src/app/login/LoginForm.tsx
- eng/web-app/src/lib/auth.ts

Rules:
- middleware.ts must protect /doctor, /pharmacist, /sponsor routes — redirect to /login if no valid JWT cookie named preventia_token
- LoginForm.tsx calls POST http://localhost:8080/api/v1/auth/login with { email, password } — on success stores JWT in a cookie (httpOnly: false for now, SameSite=Lax) and redirects to role-appropriate route:
  - DOCTOR → /doctor
  - PHARMACIST → /pharmacist
  - SPONSOR → /sponsor
  - RECIPIENT → / (mobile-only user, show message)
- auth.ts exports: getTokenFromCookie(), getUserFromToken() (decode JWT payload without verify — verification is backend's job), clearToken()
- LoginForm must match Neo-Brutalist aesthetic: black border, monospace font, 0 border-radius, matching existing DoctorDashboard styles
- Update eng/web-app/src/app/layout.tsx nav to add a Login/Logout link

---

TASK 3: Add JWT refresh endpoint (backend)
Files to create:
- eng/src/main/java/com/preventia/auth/domain/RefreshToken.java
- eng/src/main/java/com/preventia/auth/repository/RefreshTokenRepository.java
- eng/src/main/java/com/preventia/auth/service/RefreshTokenService.java
- eng/src/main/resources/db/migration/V8__refresh_tokens.sql

Files to edit:
- eng/src/main/java/com/preventia/auth/controller/AuthController.java (add POST /api/v1/auth/refresh)
- eng/src/main/java/com/preventia/auth/dto/ (add RefreshRequest.java, RefreshResponse.java)
- eng/src/main/java/com/preventia/shared/config/SecurityConfig.java (whitelist /api/v1/auth/refresh)

Rules:
- RefreshToken entity: id (UUID), userId (FK), token (UUID stored as VARCHAR), expiresAt (Instant, 30 days), createdAt
- POST /api/v1/auth/login response must now also return a refreshToken string alongside the JWT
- POST /api/v1/auth/refresh accepts { refreshToken: string } → validates against DB → returns new JWT + new refreshToken (rotation)
- Expired or unknown refreshTokens return HTTP 401
- V8 migration: CREATE TABLE refresh_tokens (id UUID PRIMARY KEY, user_id BIGINT REFERENCES users(id), token VARCHAR(255) UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())

After all 3 tasks:
- Run: cd eng && podman-compose up --build -d
- Verify backend starts: curl http://localhost:8080/actuator/health
- Commit all changes: git add -A && git commit -m "feat(auth+video): Daily.co frame rendering, Next.js auth guards, JWT refresh endpoint"
- Author: git config user.name "preventia ai" && git config user.email "preventia.ai@gmail.com" (set local config first)
```

---

## 🟠 DIRECTIVE 2 — eng agent
### Task: Stream Chat Integration (Web + Mobile)
*Completes the Patient↔Doctor↔Pharmacy communication loop. ~4.5 agent hours*
*Run this AFTER Directive 1 is committed*

---

```
You are a Principal Software Engineer (see SOUL.md). Project Preventia — continuing from previous session.

Pre-requisites (verify before starting):
- eng/shared/ package builds (cd eng/shared && npm install)
- Backend is running at http://localhost:8080

You have 2 tasks. Do them in order. Commit after each.

---

TASK 1: Stream Chat backend token service
Files to create:
- eng/src/main/java/com/preventia/chat/controller/ChatController.java
- eng/src/main/java/com/preventia/chat/service/StreamChatService.java
- eng/src/main/java/com/preventia/chat/dto/ChatTokenResponse.java

Files to edit:
- eng/pom.xml (add stream-chat dependency)
- eng/src/main/resources/application.yml (add stream.api-key, stream.api-secret)
- eng/src/main/java/com/preventia/shared/config/SecurityConfig.java (protect /api/v1/chat/**)

Rules:
- Add to pom.xml:
  <dependency>
    <groupId>io.getstream</groupId>
    <artifactId>stream-chat</artifactId>
    <version>6.8.0</version>
  </dependency>
- StreamChatService.generateToken(Long userId, String userName, String role):
  - Creates a Stream Chat user token using HMAC-SHA256 signed with stream.api-secret
  - Token payload: { user_id: userId.toString(), name: userName, role: role }
  - Returns signed JWT token string (Stream format, not Spring JWT)
- GET /api/v1/chat/token → protected by JWT auth → returns { token: string, userId: string, apiKey: string }
- application.yml additions:
  stream:
    api-key: ${STREAM_API_KEY:STUB_KEY}
    api-secret: ${STREAM_API_SECRET:STUB_SECRET}
- Add STREAM_API_KEY and STREAM_API_SECRET to eng/.env.example

---

TASK 2: Stream Chat UI — Web (Doctor dashboard chat panel) + Mobile (Patient chat screen)

Web files to create:
- eng/web-app/src/components/ChatPanel.tsx

Web files to edit:
- eng/web-app/package.json (add stream-chat, stream-chat-react)
- eng/web-app/src/components/DoctorDashboard.tsx (wire ChatPanel into the right column)

Mobile files to edit:
- eng/mobile-app/src/screens/patient/PatientChatScreen.tsx (replace mock with real Stream Chat)
- eng/mobile-app/package.json (add stream-chat, stream-chat-expo)

Rules for ChatPanel.tsx (web):
- Fetch Stream token from GET /api/v1/chat/token (use existing apiClient)
- Init StreamChat client with apiKey from response
- Show channel list: threads named "Doctor: {doctorName}" and "Pharmacy: {pharmacyName}"
- Channel type: messaging
- Use <Chat>, <ChannelList>, <Channel>, <MessageList>, <MessageInput> from stream-chat-react
- Style override: monospace font, black borders, 0 border-radius to match Neo-Brutalist theme
- Wire into DoctorDashboard: replace the right column "Peer Contacts" section with ChatPanel

Rules for PatientChatScreen.tsx (mobile):
- Replace MOCK_THREADS with real Stream Chat channel list
- Fetch token from GET /api/v1/chat/token (use fetch with stored JWT)
- Use stream-chat-expo: <OverlayProvider>, <Chat>, <ChannelList>
- Tapping a thread opens a full-screen <Channel> with <MessageList> + <MessageInput>
- Keep existing Neo-Brutalist styles (black borders, monospace)

After both tasks:
- cd eng/web-app && npm install
- cd eng/mobile-app && npm install
- git add -A && git commit -m "feat(chat): Stream Chat integration — web panel + mobile patient screen"
```

---

## 🟠 DIRECTIVE 3 — eng agent
### Task: Razorpay Live + Sponsor Web Portal
*Completes the INR payment story and the NRI persona on web. ~4 agent hours*
*Run AFTER Directive 2 is committed*

---

```
You are a Principal Software Engineer (see SOUL.md). Project Preventia — continuing from previous session.

You have 2 tasks. Do them in order. Commit after each.

---

TASK 1: Razorpay live payment flow (backend + mobile)

Backend files to edit:
- eng/pom.xml (add razorpay-java SDK)
- eng/src/main/java/com/preventia/payment/service/RazorpayGatewayService.java (replace stub)
- eng/src/main/java/com/preventia/payment/controller/PaymentController.java (add webhook endpoint)
- eng/src/main/resources/application.yml (add razorpay config block)

Mobile files to create:
- eng/mobile-app/src/screens/sponsor/PaymentScreen.tsx
- eng/mobile-app/src/screens/pharmacy/PharmacyPaymentScreen.tsx

Mobile files to edit:
- eng/mobile-app/src/screens/sponsor/BookAppointmentScreen.tsx (add payment step after booking)
- eng/mobile-app/src/navigation/types.ts (add PaymentScreen to Sponsor nav params)

Rules for backend:
- Add to pom.xml: <dependency><groupId>com.razorpay</groupId><artifactId>razorpay-java</artifactId><version>1.4.7</version></dependency>
- RazorpayGatewayService.createOrder(long amountPaise, String currency):
  - Real call: new RazorpayClient(apiKey, apiSecret).orders.create(orderRequest)
  - Return real Razorpay order ID
- POST /webhooks/razorpay:
  - Verify signature: X-Razorpay-Signature header using HMAC-SHA256(razorpay.webhook-secret, rawBody)
  - On payment.captured event: call paymentService.markPaid(orderId)
  - Return 200 OK always (Razorpay retries on non-200)
- application.yml additions:
  razorpay:
    api-key: ${RAZORPAY_API_KEY:STUB}
    api-secret: ${RAZORPAY_API_SECRET:STUB}
    webhook-secret: ${RAZORPAY_WEBHOOK_SECRET:STUB}
- Whitelist /webhooks/razorpay in SecurityConfig (no JWT needed — verified by HMAC)

Rules for PaymentScreen.tsx (mobile):
- Props: { orderId, amount, currency, description, onSuccess, onCancel }
- Use react-native WebView to open Razorpay checkout URL
- Razorpay checkout URL: https://api.razorpay.com/v1/checkout/embedded
- Pass prefill: { name, email } from AuthUser
- On payment success (WebView URL contains razorpay_payment_id): call onSuccess(paymentId)
- On back press: call onCancel()
- Style: full-screen SafeAreaView with Neo-Brutalist header

Wire into BookAppointmentScreen:
- After successful POST /api/v1/appointments, navigate to PaymentScreen with consultation fee
- After PaymentScreen.onSuccess, navigate to patient home with confirmation ActionCard

---

TASK 2: Sponsor web portal (Next.js)

Files to create:
- eng/web-app/src/app/sponsor/page.tsx
- eng/web-app/src/app/sponsor/book/page.tsx
- eng/web-app/src/components/SponsorDashboard.tsx
- eng/web-app/src/components/BookAppointmentForm.tsx

Files to edit:
- eng/web-app/src/app/layout.tsx (add "Sponsor Portal" to nav)
- eng/web-app/src/middleware.ts (already protects /sponsor — just verify)

Rules:
- SponsorDashboard.tsx:
  - Fetches GET /api/v1/appointments?sponsorId={userId} — shows parent's upcoming appointments as cards
  - Fetches GET /api/v1/patients/{recipientId}/medications/alerts — shows CRITICAL/WARNING medication badges
  - "Book Appointment" button → navigates to /sponsor/book
  - "View Prescription" link on each completed appointment → opens S3 pre-signed PDF URL in new tab
  - 3-column grid matching DoctorDashboard.tsx layout (appointments | medications | activity feed)
  - Full Neo-Brutalist aesthetic — reuse same CSS-in-JS pattern as DoctorDashboard.tsx
- BookAppointmentForm.tsx:
  - Port logic from eng/mobile-app/src/screens/sponsor/BookAppointmentScreen.tsx
  - Fields: recipientId, doctorId, startTime (datetime-local input), endTime
  - On submit: POST /api/v1/appointments → show confirmation with roomUrl
  - After booking: show Stripe payment widget for USD consultation fee (stub Stripe for now — just show the amount with "Pay" button that alerts "Stripe integration coming soon")

After both tasks:
- git add -A && git commit -m "feat(payments+sponsor): Razorpay live flow, Sponsor web portal"
```

---

## 🟡 DIRECTIVE 4 — eng agent
### Task: Push Notifications + ABHA Profile + Cleanup
*Completes safety rails and cleans technical debt. ~3.5 agent hours*
*Run AFTER Directive 3 is committed*

---

```
You are a Principal Software Engineer (see SOUL.md). Project Preventia — continuing from previous session.

You have 3 tasks. Do them in order. Commit after each.

---

TASK 1: Delete the old healthcare-mvp-mobile directory (superseded by mobile-app)
- git rm -r eng/healthcare-mvp-mobile/
- Verify no imports anywhere reference healthcare-mvp-mobile (grep -r "healthcare-mvp-mobile" eng/mobile-app eng/web-app eng/shared)
- Commit: git commit -m "chore: remove superseded healthcare-mvp-mobile directory"

---

TASK 2: Push notifications (backend + mobile)

Backend files to create:
- eng/src/main/java/com/preventia/notification/service/NotificationService.java
- eng/src/main/java/com/preventia/notification/domain/DeviceToken.java
- eng/src/main/java/com/preventia/notification/repository/DeviceTokenRepository.java
- eng/src/main/java/com/preventia/notification/controller/DeviceTokenController.java
- eng/src/main/resources/db/migration/V9__device_tokens.sql

Files to edit:
- eng/pom.xml (add firebase-admin)
- eng/src/main/resources/application.yml (add firebase config)
- eng/src/main/java/com/preventia/clinical/scheduler/PrescriptionSlaScheduler.java (trigger notification on SLA breach)
- eng/src/main/java/com/preventia/appointment/service/AppointmentService.java (trigger notification 24h before)

Mobile files to create:
- eng/mobile-app/src/hooks/useNotifications.ts

Mobile files to edit:
- eng/mobile-app/App.tsx (register for push on startup)

Rules for backend:
- Add to pom.xml: <dependency><groupId>com.google.firebase</groupId><artifactId>firebase-admin</artifactId><version>9.3.0</version></dependency>
- DeviceToken entity: id, userId (FK users), token (FCM token string), platform (ANDROID/IOS), createdAt, updatedAt
- POST /api/v1/devices/token — protected by JWT — saves or updates FCM token for the logged-in user
- NotificationService.sendToUser(Long userId, String title, String body):
  - Looks up all DeviceTokens for userId
  - Sends FCM message via FirebaseMessaging.getInstance().send(message)
  - Gracefully handles invalid tokens (remove from DB on FirebaseMessagingException with UNREGISTERED code)
- V9 migration: CREATE TABLE device_tokens (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token VARCHAR(512) NOT NULL, platform VARCHAR(20) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, platform))
- Triggers:
  - AppointmentService: after creating appointment, schedule notification for 24h before startTime using @Scheduled or Spring's TaskScheduler
  - PrescriptionSlaScheduler: when SLA is breached, call notificationService.sendToUser(pharmacistId, "SLA BREACH", "Prescription review overdue")
- application.yml: firebase.credentials-path: ${FIREBASE_CREDENTIALS_PATH:classpath:firebase-stub.json}

Rules for mobile:
- useNotifications.ts:
  - On mount: request permissions via expo-notifications
  - Get Expo push token via Notifications.getExpoPushTokenAsync()
  - POST token to /api/v1/devices/token with Authorization header
  - Listen for incoming notifications with Notifications.addNotificationReceivedListener
  - Return { expoPushToken, permissionGranted }
- App.tsx: call useNotifications() at root level after auth

---

TASK 3: ABHA / NRI Profile fields UI

Mobile files to create:
- eng/mobile-app/src/screens/patient/PatientProfileEditScreen.tsx

Mobile files to edit:
- eng/mobile-app/src/screens/patient/PatientProfileScreen.tsx (add "Edit Profile" button)
- eng/mobile-app/src/navigation/types.ts (add ProfileEdit to Patient nav params)
- eng/mobile-app/src/navigation/PatientNavigator.tsx (add ProfileEdit screen)

Rules for PatientProfileEditScreen.tsx:
- Fields: Full Name, ABHA ID (format: ##-####-####-####, with inline format hint), Phone (India +91), Country of Residence (dropdown: India / USA / UK / Canada / Australia / Other), NRI flag (toggle)
- Calls PUT /api/v1/users/{userId}/profile (endpoint already exists via FamilyController — check first; if not, use PATCH)
- Validate ABHA ID format with regex before submit
- Save button: "SAVE PROFILE" in Neo-Brutalist ActionCard style
- After save: navigate back to ProfileScreen with success banner

After all 3 tasks:
- cd eng && podman-compose up --build -d
- Verify all migrations applied: podman exec preventia-postgres psql -U dhan_dev -d preventia_db -c "SELECT version, description FROM flyway_schema_history ORDER BY installed_rank;"
- git add -A && git commit -m "feat(notifications+profile): FCM push, ABHA profile edit, remove legacy mobile dir"
```

---

## 🟡 DIRECTIVE 5 — ops agent
### Task: NRI Bridge Notifications + Thyrocare Stub to Live
*ops agent's core mandate per SOUL.md + INSTRUCTIONS.md*

---

```
You are the Operations Lead for Project Preventia (see SOUL.md — obsessed with cold chain, Indian geography).

Context: The eng agent has completed or is completing the core platform. Your job is the NRI Bridge — automated updates to NRI children when their parents' samples are collected and results are ready.

You have 2 tasks. Reference ops/INSTRUCTIONS.md for your mandate.

---

TASK 1: NRI Bridge notification flow (automated parent → child updates)

This is your PRIMARY mandate. When a Recipient (parent in India) has a lab test collected:
1. Thyrocare/lab partner notifies our webhook that sample was collected
2. Our system immediately notifies the linked Sponsor (NRI child) via push + a status update in their dashboard

Files to create:
- eng/src/main/java/com/preventia/lab/controller/LabWebhookController.java
- eng/src/main/java/com/preventia/lab/service/LabResultNotificationService.java
- eng/mobile-app/src/screens/sponsor/LabResultsScreen.tsx

Files to edit:
- eng/src/main/java/com/preventia/lab/service/LabOrderService.java (add status update on webhook receipt)
- eng/mobile-app/src/screens/sponsor/SponsorDashboard.tsx (add "Lab Results" section with status badges)
- eng/src/main/java/com/preventia/shared/config/SecurityConfig.java (whitelist /webhooks/lab)

Rules for LabWebhookController:
- POST /webhooks/lab/thyrocare — receives Thyrocare webhook (no auth — verified by API key in query param ?apiKey=)
- Payload: { orderId, status: "SAMPLE_COLLECTED" | "PROCESSING" | "RESULT_READY", resultPdfUrl? }
- On SAMPLE_COLLECTED: update LabOrder.status → SAMPLE_COLLECTED, notify Sponsor: "🧪 Sample collected for {recipientName} — results in 24–48 hours"
- On RESULT_READY: store resultPdfUrl in S3 (download + re-upload to our bucket for data residency), update LabOrder.status → RESULT_READY, notify Sponsor: "✅ Lab results ready for {recipientName} — tap to view"
- All notifications via NotificationService.sendToUser() (built by eng agent in Directive 4)

Rules for LabResultsScreen.tsx (mobile, Sponsor view):
- Shows list of parent's lab orders with status timeline: ORDERED → SAMPLE_COLLECTED → PROCESSING → RESULT_READY
- Status displayed as brutalist progress steps (filled black squares for completed, empty for pending)
- RESULT_READY row has "VIEW PDF" button → opens S3 pre-signed URL
- City + collection center shown (per your cold-chain + geography mandate — add collection_city and lab_partner_name to LabOrder if not present)

---

TASK 2: Thyrocare API — replace stub with real integration structure
(Note: live credentials may not be available yet — build production-ready structure that works with stubs and can be activated with env vars)

Files to edit:
- eng/src/main/java/com/preventia/lab/service/ThyrocareApiService.java

Rules:
- Structure the real HTTP call to https://new.thyrocare.com/api/Master/GetTestData using RestClient
- Auth: API key passed as query param ?API_KEY={apiKey}
- placeOrder() should build the correct Thyrocare order payload:
  {
    "Api_key": apiKey,
    "OrderId": labOrder.getId().toString(),
    "ProductCode": labOrder.getTestCode(),
    "PatientName": labOrder.getPatientName(),
    "Age": labOrder.getPatientAge(),
    "Gender": labOrder.getPatientGender(),
    "PinCode": labOrder.getPatientPinCode(),
    "Mobile": labOrder.getPatientPhone(),
    "Hc": 1,
    "AppointDate": labOrder.getScheduledDate(),
    "Slot": "M"
  }
- If THYROCARE_API_KEY env var is "STUB", log the payload and return stub IDs (existing behavior preserved)
- If real key is set, make actual HTTP call and parse response
- Add patientName, patientAge, patientGender, patientPinCode, patientPhone, collectionCity fields to LabOrder entity if not present
- Add V10 migration for new LabOrder columns

After both tasks:
- git add -A && git commit -m "feat(nri-bridge): lab webhook, Thyrocare API structure, NRI notification flow"
```

---

## 🟢 DIRECTIVE 6 — pm agent
### Task: Track Progress + Generate Sprint Report
*Run at the end of each day after eng/ops agents commit their work*

---

```
You are the Department Head / PM (see SOUL.md — prevent scope creep, own the token budget).

Context: eng and ops agents have been executing on the Preventia MVP. Read the following files to understand current state:
- prd.md (product requirements)
- eng/src/main/resources/db/migration/ (what's been built in DB)
- eng/web-app/src/ (web frontend state)
- eng/mobile-app/src/ (mobile frontend state)
- Check git log: git log --oneline -20

Your tasks:

1. Create or update eng/TODO.md with current status:
   - Mark completed items ✅
   - Mark in-progress items 🔄
   - Mark pending items ❌
   - Add a "Blockers" section for anything requiring external credentials (Daily.co key, Razorpay live, Thyrocare)

2. Create eng/STATUS_REPORT.md entry for today (2026-03-12) using the format from pm/INSTRUCTIONS.md:
   - Phase: Sprint 2 — Core Feature Completion
   - Include: % complete by layer (Backend, Web, Mobile, Infra)
   - List technical blockers
   - Token budget consumed (estimate based on session history)
   - Next immediate actions

3. Update the root prd.md to reflect current implementation status — add a "## Implementation Status" section at the bottom that matches what's actually built vs what's specified

4. Flag any scope creep you see — anything being built that is NOT in prd.md sections 1–6

5. Alert if this session has exceeded 15,000 tokens (check conversation length) and suggest Summary Handoff if needed.

Output: Write all reports to files. End with a 3-line executive summary for the user.
```

---

## Execution Order

```
Day 1 Morning:   eng   ← Directive 1 (video + auth + refresh)      ~2.5h
Day 1 Afternoon: eng   ← Directive 2 (Stream Chat)                  ~4.5h
Day 2 Morning:   eng   ← Directive 3 (Razorpay + Sponsor web)       ~4h
Day 2 Afternoon: ops   ← Directive 5 (NRI Bridge + Thyrocare)       ~3h
Day 3 Morning:   eng   ← Directive 4 (push + ABHA + cleanup)        ~3.5h
Day 3 EOD:       pm    ← Directive 6 (tracking + report)            ~30min
```

## Credential Checklist (You need these before agents can finish)

Get these NOW — they're the critical path:

| Credential | Where | Time to get | Needed for |
|---|---|---|---|
| `DAILY_API_KEY` | dashboard.daily.co → Developers → API Key | **5 min** (free) | Directives 1, 2 |
| `DAILY_WEBHOOK_SECRET` | dashboard.daily.co → Webhooks | 5 min | Directive 1 |
| `STREAM_API_KEY` + `STREAM_API_SECRET` | dashboard.getstream.io → App → API Credentials | **10 min** (free tier) | Directive 2 |
| `RAZORPAY_API_KEY` + `RAZORPAY_API_SECRET` | dashboard.razorpay.com → Settings → API Keys (Test Mode) | **10 min** | Directive 3 |
| `RAZORPAY_WEBHOOK_SECRET` | dashboard.razorpay.com → Webhooks | 5 min | Directive 3 |
| `FIREBASE_CREDENTIALS_PATH` | console.firebase.google.com → Service Accounts → Generate key | **15 min** | Directive 4 |

Total time to get all credentials: ~50 minutes. Add them to `eng/.env` before starting agents.
