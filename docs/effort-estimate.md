# Preventia — Effort Estimate to Full E2E MVP
**Date:** March 12, 2026 | **Estimating against:** PRD §1–6

---

## How to read this estimate

| Column | Meaning |
|---|---|
| **Files to create/edit** | Concrete file count based on current codebase audit |
| **Tokens** | Claude Sonnet-class tokens (input + output per task) |
| **Human-hours** | Your review, config, credential setup, testing |
| **Agent-hours** | Autonomous coding time (openclaw / Copilot agent) |

**Token basis:** ~1 token ≈ 4 chars. A 200-line TypeScript file ≈ 6,000 tokens to write with full context. A 150-line Java service ≈ 5,000 tokens.

---

## Task Breakdown

### 1. 🧹 Cleanup: Delete `healthcare-mvp-mobile/` (old directory)
**What:** Remove superseded directory, update any imports that reference it  
**Complexity:** Trivial

| Metric | Estimate |
|---|---|
| Files touched | ~1 (git rm -r) |
| Tokens | ~2,000 |
| Agent time | 5 min |
| Human time | 5 min (verify nothing breaks) |

---

### 2. 🔐 Auth Guards + Token Refresh (Web + Mobile)
**What needs building:**
- Next.js `middleware.ts` — protect `/doctor`, `/pharmacist`, `/sponsor` routes by checking JWT cookie
- `AuthContext.tsx` — React context wrapping login state for web
- Backend: `POST /api/v1/auth/refresh` endpoint + `RefreshToken` entity + DB migration (V8)
- Mobile: token expiry check in `useAuth.ts` + silent refresh call
- Web: login page `/login` with role-aware redirect

**Files:** 8 new, 4 edited  
**Complexity:** Medium (JWT refresh has security nuance)

| Metric | Estimate |
|---|---|
| Tokens | ~45,000 |
| Agent time | 2–3 hours |
| Human time | 1 hour (test login/logout flow, set cookie secrets) |

---

### 3. 📹 Fix Video Tile Rendering (Web `ConsultationRoom`)
**What needs building:**
- Wire `Daily.createFrame()` to the `frameRef` div in `ConsultationRoom.tsx`
- Handle camera/mic permission prompts in the browser
- Test with a real Daily.co API key

**Files:** 1 edited (`ConsultationRoom.tsx`), 1 edited (`useConsultationRoom.ts`)  
**Complexity:** Low-Medium (Daily.co iframe API is well-documented)

| Metric | Estimate |
|---|---|
| Tokens | ~12,000 |
| Agent time | 30 min |
| Human time | 1 hour (requires real `DAILY_API_KEY` env var + browser test) |

---

### 4. 💬 Stream Chat Integration (Web + Mobile)
**What needs building:**

**Backend:**
- `ChatController.java` — `GET /api/v1/chat/token?userId=` (issues Stream Chat JWT)
- `StreamChatService.java` — calls Stream server-side API to generate user tokens
- `application.yml` additions: `stream.api-key`, `stream.api-secret`

**Web (`web-app`):**
- `ChatPanel.tsx` — embedded `<Channel>` component in DoctorDashboard sidebar
- Threads: Doctor↔Patient, Doctor↔Pharmacy
- Uses `stream-chat-react` package

**Mobile (`mobile-app`):**
- `PatientChatScreen.tsx` — replace mock with real `StreamChat` client (currently 150-line placeholder)
- Uses `stream-chat-expo` package
- Channel list + message composer

**Files:** 3 new backend, 2 new frontend, 2 edited  
**Complexity:** Medium-High (two SDKs, two platforms, backend token service)

| Metric | Estimate |
|---|---|
| Tokens | ~70,000 |
| Agent time | 4–5 hours |
| Human time | 2 hours (Stream dashboard setup, API keys, test message send) |

---

### 5. 💳 Razorpay Live Payment Flow (Mobile + Backend)
**What needs building:**

**Backend:**
- Replace `RazorpayGatewayService.createOrder()` stub with real `razorpay-java` SDK call
- Add `POST /webhooks/razorpay` — HMAC-SHA256 verification + payment status update
- Add Razorpay SDK to `pom.xml`

**Mobile:**
- `PaymentScreen.tsx` (new) — Razorpay checkout webview for UPI/card
- Wire into `BookAppointmentScreen` and `PharmacyOrdersScreen`
- Handle payment success/failure callbacks

**Files:** 3 edited backend, 2 new mobile  
**Complexity:** Medium (Razorpay SDK is mature; webhook security is critical)

| Metric | Estimate |
|---|---|
| Tokens | ~40,000 |
| Agent time | 3 hours |
| Human time | 2 hours (Razorpay test mode keys, webhook tunnel via ngrok, end-to-end payment test) |

---

### 6. 💳 Stripe Live Payment Flow (Web + Backend)
**What needs building:**

**Backend:**
- Replace `StripeGatewayService` stub with real `stripe-java` SDK
- Add `POST /webhooks/stripe` — Stripe signature verification
- Add Stripe SDK to `pom.xml`

**Web:**
- `PaymentModal.tsx` — Stripe Elements (`@stripe/react-stripe-js`) for USD card payment
- Wire into DoctorDashboard for consultation fee billing to Sponsor

**Files:** 3 edited backend, 2 new web  
**Complexity:** Medium (Stripe Elements well-documented; test mode easy)

| Metric | Estimate |
|---|---|
| Tokens | ~40,000 |
| Agent time | 3 hours |
| Human time | 2 hours (Stripe test keys, webhook endpoint, 3DS test card) |

---

### 7. 🏠 Sponsor Web Portal (Next.js)
**What needs building:**
- `/sponsor/page.tsx` — Sponsor dashboard (parent's appointments, medication alerts, pay for consultation)
- `/sponsor/book/page.tsx` — Book appointment form (port from `BookAppointmentScreen.tsx`)
- `SponsorDashboard.tsx` web component
- Add "Sponsor Portal" to nav in `layout.tsx`

**Files:** 3 new, 1 edited  
**Complexity:** Low (direct port of existing mobile screens to HTML/CSS)

| Metric | Estimate |
|---|---|
| Tokens | ~30,000 |
| Agent time | 2 hours |
| Human time | 30 min (visual review) |

---

### 8. 🏥 Health Coach / Wellness Portal (Web + Mobile)
**What needs building:**

This is the most underspecified item. Based on the mockup "Provider - Health coach Wellness session care provider portal.jpeg":

**Backend:**
- `WellnessSession` entity + migration (V8 or V9)
- `WellnessController` — CRUD for wellness sessions
- Separate from `Appointment` (no Daily.co room, uses pre-recorded or live group sessions)

**Web:**
- `/coach/page.tsx` — Coach dashboard
- `WellnessSessionCard.tsx` — session list with status

**Mobile:**
- `CoachNavigator.tsx` + `CoachDashboardScreen.tsx`

**Files:** ~10 new  
**Complexity:** Medium-High (new domain model, unclear PRD spec — needs clarification)

| Metric | Estimate |
|---|---|
| Tokens | ~60,000 |
| Agent time | 4–5 hours |
| Human time | 3 hours (PRD clarification needed first, then feature review) |

---

### 9. 🧪 Thyrocare Lab Ordering (Live)
**What needs building:**
- Replace `ThyrocareApiService` stub with real REST calls to `https://new.thyrocare.com/api/`
- Store result PDF in S3 + notify patient
- `LabResultScreen.tsx` (mobile) — view PDF result

**Files:** 2 edited backend, 1 new mobile  
**Complexity:** Medium (depends on Thyrocare API access — gated by vendor onboarding)

| Metric | Estimate |
|---|---|
| Tokens | ~25,000 |
| Agent time | 2 hours (code only) |
| Human time | 3–5 hours (Thyrocare vendor registration, sandbox credentials, API testing) |

---

### 10. 📱 Push Notifications (FCM + APNs)
**What needs building:**

**Backend:**
- `NotificationService.java` — Firebase Admin SDK wrapper
- Triggers: appointment reminder (24h before), medication alert (CRITICAL), prescription ready
- `DeviceToken` entity + migration

**Mobile:**
- `expo-notifications` setup + permission request
- `useNotifications.ts` hook — register device token, handle foreground/background

**Files:** 4 new backend, 2 new mobile  
**Complexity:** Medium (Expo notifications well-documented; FCM/APNs setup has platform overhead)

| Metric | Estimate |
|---|---|
| Tokens | ~40,000 |
| Agent time | 3 hours |
| Human time | 2 hours (FCM project setup, test device, APNs cert for iOS production) |

---

### 11. 🔒 ABHA / NRI Profile Fields (UI)
**What needs building:**
- `ProfileEditScreen.tsx` (mobile) — ABHA ID field, NRI flag, country-of-residence
- `/profile` web page for Sponsor/Doctor
- Wire to existing `V2__add_user_abha_nri_fields.sql` (already migrated)

**Files:** 2 new, 2 edited  
**Complexity:** Low

| Metric | Estimate |
|---|---|
| Tokens | ~18,000 |
| Agent time | 1.5 hours |
| Human time | 30 min |

---

### 12. 🚀 CI/CD Pipeline (GitHub Actions)
**What needs building:**
- `.github/workflows/backend.yml` — Maven build + test on PR
- `.github/workflows/web.yml` — Next.js build + lint
- `.github/workflows/mobile.yml` — Expo type-check + Jest
- Docker image build + push to ECR (optional for MVP)

**Files:** 3 new  
**Complexity:** Low-Medium

| Metric | Estimate |
|---|---|
| Tokens | ~20,000 |
| Agent time | 1.5 hours |
| Human time | 1 hour (GitHub secrets setup, first passing run) |

---

### 13. 🧪 Integration & E2E Tests
**What needs building:**
- Backend: `AppointmentControllerTest.java`, `AuthControllerTest.java` (Spring Boot Test + Testcontainers)
- Web: Playwright E2E for Doctor login → book appointment → consult → lock
- Mobile: additional Jest tests for screens

**Files:** ~8 new  
**Complexity:** Medium

| Metric | Estimate |
|---|---|
| Tokens | ~50,000 |
| Agent time | 4 hours |
| Human time | 2 hours (review, fix flaky tests) |

---

## 📊 Total Estimate Summary

| Task | Tokens | Agent Hours | Human Hours |
|---|---|---|---|
| 1. Cleanup old directory | 2,000 | 0.1 | 0.1 |
| 2. Auth guards + token refresh | 45,000 | 2.5 | 1.0 |
| 3. Fix video tile rendering | 12,000 | 0.5 | 1.0 |
| 4. Stream Chat (web + mobile) | 70,000 | 4.5 | 2.0 |
| 5. Razorpay live | 40,000 | 3.0 | 2.0 |
| 6. Stripe live | 40,000 | 3.0 | 2.0 |
| 7. Sponsor web portal | 30,000 | 2.0 | 0.5 |
| 8. Health Coach portal | 60,000 | 4.5 | 3.0 |
| 9. Thyrocare live | 25,000 | 2.0 | 4.0 |
| 10. Push notifications | 40,000 | 3.0 | 2.0 |
| 11. ABHA profile fields | 18,000 | 1.5 | 0.5 |
| 12. CI/CD pipeline | 20,000 | 1.5 | 1.0 |
| 13. Integration & E2E tests | 50,000 | 4.0 | 2.0 |
| **TOTAL** | **~452,000** | **~32 hours** | **~21 hours** |

---

## 🗓️ Realistic Timeline

### With openclaw agents (3 agents in parallel)
```
Week 1 (Mar 13–19):  Tasks 1, 2, 3, 7        → Auth fixed, video works, Sponsor portal live
Week 2 (Mar 20–26):  Tasks 4, 5, 6            → Chat + payments live (test mode)
Week 3 (Mar 27–Apr 2): Tasks 8, 10, 11        → Coach portal, push notifications, profiles
Week 4 (Apr 3–9):    Tasks 9, 12, 13          → Thyrocare live, CI/CD, tests
```
**Total calendar time: ~4 weeks to full E2E MVP**

### With single developer (no agents)
```
Week 1–2:   Backend completions (Razorpay, Stripe, Chat token, push)
Week 3–4:   Web frontend (Sponsor portal, Coach portal, payments)
Week 5:     Mobile (chat, push, payments)
Week 6:     Tests, CI/CD, polish
```
**Total calendar time: ~6–8 weeks**

---

## ⚠️ Risk Items (Not Token-Bounded — Depend on Vendor Access)

| Risk | Impact | Mitigation |
|---|---|---|
| **Thyrocare API access** | 2–3 weeks vendor onboarding | Build UI against stub first; swap service later |
| **Daily.co API key** | Blocks ALL video testing | Get free tier key immediately — 5 min setup at daily.co |
| **Razorpay test mode → live** | KYC + bank account verification (3–7 days) | Use test mode for MVP demo |
| **APNs cert for iOS push** | Requires Apple Developer account ($99/yr) | Use Android-only for MVP demo |
| **Stream Chat pricing** | Free tier: 1M messages/month | Sufficient for MVP |

---

## 💡 Recommended Agent Task Order for Maximum Demo Value

If you want a **live demo-ready build in 1 week**, prioritize in this order:

1. **Task 3** (video works) — most visual impact, 30 min
2. **Task 2** (auth guards) — required for security before any demo
3. **Task 7** (Sponsor web) — completes the NRI persona story
4. **Task 4** (Stream Chat) — completes the communication loop
5. **Task 5** (Razorpay test mode) — completes the payment story in INR

That's ~197,000 tokens and ~12.5 agent hours for a compelling investor/demo build.
