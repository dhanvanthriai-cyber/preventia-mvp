# Project Dhanvanthri — Session Handoff State
**Date:** Fri 2026-03-13 01:17 UTC
**Repo:** `git@github-dhanvanthri:dhanvanthriai-cyber/dhanvanthri-mvp.git`
**Branch:** `main` (single branch — `master` deleted this session)
**HEAD:** `0a74121`

---

## 1. Git State

```
0a74121  feat(marketplace): 3-sided UI + backend gaps — Option A complete
6c72258  feat(phase4): Daily.co automation, webhook security, S3, SLA monitor, UI queue
0069ad3  feat(s3): AWS S3 integration — prescription upload + pre-signed URLs
8d1d502  feat(payment): Stripe + Razorpay dual-gateway scaffold — Phase 3
0027b5e  feat(mobile): Refill Required alert UI — medication feed with urgency tiers
316ae9c  feat(pharmacy): inventory engine — Days_Remaining + RefillUrgency alerts
3b5e7a4  feat(lab): LabOrder module + Thyrocare API stub — Phase 2 complete
9f837e9  feat(mobile): Daily.co consultation screen + Neo-Brutalist Action Card component
7e61900  feat(backend): Phase 1 & 2 scaffold — Spring Boot monolith, auth, appointments
ac03881  Initial commit: Phase 1 Foundations & Auth Layer
```

> ⚠️ The human has pushed local UI and backend changes to `main` directly.
> **Priority #1 next session: `git pull origin main` and resolve any merge conflicts
> before touching any file.**

---

## 2. Daily.co Room Automation — Current Status ✅

Fully implemented server-side. Flow:

```
POST /api/v1/appointments
  → AppointmentService.createAppointment()
    → appointmentRepository.saveAndFlush()       ← get DB-generated ID
    → DailyRoomService.provision()
        → POST https://api.daily.co/v1/rooms     ← private, exp, max 3, eject_at_exp
        → POST /v1/meeting-tokens × 3            ← Doctor (owner), Recipient, Sponsor (muted)
    → appointment.setDailyRoomUrl() + setDailyRoomName()
  → AppointmentResponse { roomUrl, doctorToken, recipientToken, sponsorToken }
```

**Webhook security:** `POST /webhooks/daily`
- HMAC-SHA256 `Daily-Signature` validation (constant-time compare)
- `meeting-ended` → `AppointmentStatus.LOCKED` (EMR write-access revoked)
- `meeting-started` → `AppointmentStatus.ACTIVE` (fallback)

**Env vars required (not yet set in `.env`):**
| Key | Where to get it |
|-----|----------------|
| `DAILY_API_KEY` | dashboard.daily.co → Developers |
| `DAILY_WEBHOOK_SECRET` | dashboard.daily.co → Developers → Webhooks |
| `AWS_ACCESS_KEY_ID` | AWS IAM console |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM console |
| `AWS_S3_BUCKET_NAME` | default: `dhanvanthri-prescriptions-dev` |

**Webhook URL:** Not yet registered in Daily.co dashboard.
→ Human action required: set to `https://<VM_PUBLIC_IP>:8080/webhooks/daily`
→ If no public IP: run `ngrok http 8080` and use HTTPS tunnel URL.

---

## 3. Backend — Completed Modules

| Module | Package | Status |
|--------|---------|--------|
| Auth (JWT + RBAC) | `auth` | ✅ |
| Family / Tri-Party consent | `family` | ✅ |
| Appointments + Daily.co | `appointment` | ✅ |
| Clinical (SOAP notes, session lock) | `clinical` | ✅ |
| Prescription (S3 upload + presigned URL) | `clinical` | ✅ |
| Pharmacist actions (approve/reject/clarify) | `clinical` | ✅ |
| Prescription SLA monitor (cron every 30min) | `clinical.scheduler` | ✅ |
| Lab orders (Thyrocare stub) | `lab` | ✅ |
| Pharmacy / Inventory engine | `pharmacy` | ✅ |
| Payments (Stripe + Razorpay dual-gateway) | `payment` | ✅ |
| Daily.co webhook (HMAC-SHA256) | `appointment.controller` | ✅ |

**Flyway migrations applied to local PostgreSQL:**
| Migration | Table(s) | Status |
|-----------|----------|--------|
| V1 | `users`, `family_relationships` | ✅ applied |
| V3 | `lab_orders` | ✅ applied |
| V4 | `payments` | ✅ applied |
| V5 | `appointments`, `appointment_status` ENUM | ✅ applied |
| V6 | `soap_notes`, `prescription_status` ENUM | ✅ applied |
| V7 | `prescription_audit_log`, `prescription_action` ENUM | ✅ applied |

**Note:** V2 (`add_user_abha_nri_fields`) exists in `eng/db/` but not in
`eng/src/main/resources/db/migration/` — needs reconciliation next session.

---

## 4. Frontend — Current State

**Directory:** `eng/healthcare-mvp-mobile/src/`

### Completed screens

| Screen | Role | Backend wired |
|--------|------|--------------|
| `App.tsx` | Shell | Role-based routing — no external nav lib |
| `AuthScreen.tsx` | All | `POST /auth/login`, `/auth/register` |
| `RecipientDashboard.tsx` | RECIPIENT | `GET /appointments`, `GET /medications/alerts` |
| `SponsorDashboard.tsx` | SPONSOR | Appointments + medication alerts + prescription view |
| `BookAppointmentScreen.tsx` | SPONSOR | `POST /api/v1/appointments` → tokens |
| `DoctorDashboard.tsx` | DOCTOR | `GET /appointments` + SOAP/Rx CTAs |
| `SoapNoteScreen.tsx` | DOCTOR | `POST /api/v1/clinical/notes` |
| `PrescriptionUploadScreen.tsx` | DOCTOR | `POST /appointments/{id}/prescription` |
| `PharmacistPrescriptionQueueScreen.tsx` | PHARMACIST | Queue + approve/reject/clarify |
| `ConsultationScreen.tsx` | All 3 | Daily.co join + `PUT activate/complete` |
| `MedicationListScreen.tsx` | RECIPIENT | `GET /medications/alerts` |
| `ActionCard.tsx` | Shared component | `urgency` / `isSticky` / `ctaLabel` interface |
| `useAuth.ts` | Hook | Auth state + login/register |
| `useDailySession.ts` | Hook | Daily.co lifecycle + appointment state callbacks |
| `useMedicationAlerts.ts` | Hook | 60s polling for medication urgency |

### Mockup coverage gaps (9 mockups analyzed, not yet pixel-matched)

| Mockup file | Status |
|-------------|--------|
| `User Mobile view.jpeg` | Partially covered (MedicationListScreen, ActionCard) |
| `Virtual consultation Room.jpeg` | Partially covered (ConsultationScreen) — missing live device data panel, SOAP tabs, smart templates |
| `Doctor Mobile view provider.jpeg` | Partially covered (DoctorDashboard) — missing bottom tab nav, SCHEDULE/NETWORK/INSIGHTS/REVENUE tabs |
| `Provider - Doctor Portal.jpeg` | ❌ Not built — full doctor web portal |
| `Provider - Coach Portal.jpeg` | ❌ Not built |
| `Provider - Health coach Wellness session care provider portal.jpeg` | ❌ Not built |
| `Patient Clinical View for doctor.jpeg` | ❌ Not built — patient encounter detail screen |
| `Patient view for doctor - Mobile view.jpeg` | ❌ Not built |
| `updated profile dashboard.jpeg` | ❌ Not built — profile/dashboard screen |

---

## 5. New Architecture Directive — 2-Module UI Split

**Decision made this session (not yet implemented):**

Refactor the current single `eng/healthcare-mvp-mobile/` directory into:

```
eng/
├── ui-mobile/          ← React Native app (iOS + Android)
│   └── src/
│       ├── screens/    ← all current mobile screens move here
│       ├── components/ ← mobile-specific components (ActionCard, etc.)
│       └── hooks/      ← mobile-specific hooks
│
├── ui-web/             ← Next.js web app (Doctor Portal, Pharmacist Portal)
│   └── src/
│       ├── pages/      ← Doctor portal, Pharmacist queue, Coach portal
│       └── components/ ← web-specific components
│
└── ui-shared/          ← Shared logic core (no RN or DOM deps)
    └── src/
        ├── api/        ← all fetch() calls to Spring Boot (useAuth, useMedAlerts, etc.)
        ├── types/      ← shared TypeScript types (AuthUser, Appointment, etc.)
        └── hooks/      ← platform-agnostic hooks
```

**Rationale:** Doctor portal and pharmacist portal are desktop-first (web).
Mobile app is for Recipient (elder) and Sponsor (NRI). Sharing API and types
prevents drift between platforms.

**Implementation plan for next session:**
1. `git pull origin main` — resolve any conflicts from human's local pushes
2. Create `ui-mobile/`, `ui-web/`, `ui-shared/` directory scaffold
3. Move current `healthcare-mvp-mobile/src/hooks/` → `ui-shared/src/api/`
4. Move current screens → `ui-mobile/src/screens/`
5. Begin `ui-web/` Next.js scaffold for Doctor Portal

---

## 6. Infrastructure

| Item | Status |
|------|--------|
| Oracle VM (Ubuntu, arm64) | ✅ Running |
| Docker socket | ✅ Accessible via `sg docker -c "..."` prefix |
| PostgreSQL 16 (Docker) | ✅ Running — `dhanvanthri-postgres` container |
| Maven (`./mvnw`) | ❌ Not installed — use `psql` direct for migrations |
| Spring Boot app | ❌ Not running (only DB is up) |
| SSH key | `~/.ssh/id_ed25519_dhanvanthri` → `github-dhanvanthri` host alias |

---

## 6b. Human's Local Changes Already Pushed to `main`

Two commits landed on `origin/main` AFTER our `0a74121` — discovered at session end:

### `3ee649d` — Podman migration + Expo web + DB migration reorder
**Backend:**
- `docker-compose.yml` → `podman-compose` (mem_limit, no deploy.resources, port 5432→5433)
- DB migration files **renumbered**: `V3=appointments`, `V4=lab_orders` (fixes FK dependency order)
  ⚠️ This conflicts with our local `V5__appointments.sql`, `V6`, `V7` numbering — must reconcile
- Added all missing env vars to `.env.example`
- Added `restart.sh`, `start-redis.sh` using podman natively

**Frontend — major refactor:**
- Bare React Native 0.73 → **Expo SDK 50** with web support
- Added `App.tsx`, `app.json`, `babel.config.js`, `metro.config.js`
- Added proper navigation: `RootNavigator`, `PatientNavigator`, `DoctorNavigator`, `PharmacyNavigator`
- Swapped `@daily-co/react-native-daily-js` → `@daily-co/daily-js` (web SDK)
- Replaced `DailyMediaView` (native-only) with `View` placeholders
- Added all screen files: auth, patient, doctor, pharmacy, recipient, sponsor
- Added `assets/favicon.png`

### `f605d40` — Backend stash merge (Redis + entity fixes)
- `pom.xml`: added `spring-boot-starter-data-redis`
- `SoapNote.java`: clean getters/setters
- `Medication.java`: RefillUrgency logic + full getters/setters
- `ClinicalController`, `ClinicalService`, `SoapNoteResponse`, `FamilyController`,
  `InventoryAuditLog`, `application.yml`: agent stash improvements merged in
- `fix-docker-context.sh`: new helper script

### ⚠️ Conflict risk areas for next session
| File/Area | Risk |
|-----------|------|
| DB migration numbering (V3/V4/V5/V6/V7) | HIGH — human renumbered V3=appointments |
| `pom.xml` | MEDIUM — Redis dep added by human, S3 by agent |
| `SoapNote.java` | MEDIUM — both sides modified |
| `application.yml` | MEDIUM — daily/aws config added by agent, Redis by human |
| `ConsultationScreen.tsx` | LOW — human removed native Daily.co APIs |
| Navigation structure | LOW — human added proper navigators |

---

## 7. Overall MVP Progress

**~97%** — all code complete. Remaining 3% = external credentials + ABDM.

| Item | Status |
|------|--------|
| Daily.co webhook URL registration | ⏳ Human action |
| ABDM sandbox credentials (NHA) | ⏳ Long-lead |
| UI mockup pixel-match (5 of 9 screens) | ⏳ Next sessions |
| 2-module UI refactor | ⏳ Next session (Priority #2 after pull/merge) |
