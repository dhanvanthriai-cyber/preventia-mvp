# Preventia MVP — PRD Progress Report
**Date:** March 12, 2026 | **Stack:** Spring Boot 3.x · Next.js 14 · Expo RN 50 · PostgreSQL 16

---

## Project Structure (Current)
```
eng/
├── src/                  ← Spring Boot backend (modular monolith)
├── web-app/              ← Next.js 14 (Doctor + Pharmacist portals) ← NEW
├── mobile-app/           ← Expo React Native (Patient, Sponsor, Pharmacy) ← NEW
├── shared/               ← Platform-agnostic TS types + API client ← NEW
└── healthcare-mvp-mobile/ ← OLD (superseded by mobile-app — can be cleaned up)
```

---

## ✅ DONE

### Backend — Spring Boot Modular Monolith
| Module | What's Built |
|---|---|
| **Auth** | JWT login/register, role-based (`RECIPIENT`, `SPONSOR`, `DOCTOR`, `PHARMACIST`), `JwtAuthFilter`, `JwtTokenProvider`, `SecurityConfig` |
| **Appointment** | Full CRUD, `AppointmentStatus` enum (SCHEDULED→ACTIVE→COMPLETED→LOCKED), Daily.co room auto-provisioning (`DailyRoomService`), webhook handler (`DailyWebhookController`) |
| **Clinical / SOAP** | `SoapNote` entity, `ClinicalController`, `PrescriptionController`, S3 PDF upload, `PrescriptionSlaScheduler` (4-hour SLA enforcement) |
| **Pharmacy / Inventory** | `Medication`, `InventoryAuditLog`, `RefillUrgency` (CRITICAL/WARNING/OK), `InventoryService`, `PharmacyController`, Days Remaining engine |
| **Lab Orders** | `LabOrder`, `LabOrderService`, `ThyrocareApiService` stub, `LabOrderController`, status tracking |
| **Payments** | `Payment` entity, Razorpay + Stripe gateway stubs, `PaymentController`, dual-currency support (INR/USD) |
| **Family / Sponsor** | `FamilyRelationship`, sponsor↔recipient linking, `FamilyController` |
| **Shared Infra** | `S3Config` + `S3Service` (AWS ap-south-1), `FhirMapper` (FHIR R4 / ABDM-aligned), Redis config, HAPI FHIR |
| **DB Migrations** | 7 Flyway migrations (V1–V7): schema, appointments, lab_orders, payments, SOAP notes, prescription audit log |

### Web App — Next.js 14
| Screen/Component | Status |
|---|---|
| `DoctorDashboard` | ✅ Full 3-column Neo-Brutalist layout, appointment queue, live refresh, consult fee config, peer contacts |
| `ConsultationRoom` | ✅ Daily.co iframe, session status (IDLE/JOINING/ACTIVE/LOCKED), participant count, SOAP note lock trigger |
| `PharmacistQueue` | ✅ Prescription review queue, SLA countdown badge (4h), approve/reject/clarify actions, auto-poll (60s), S3 PDF link |
| `/doctor` route | ✅ Page + metadata |
| `/pharmacist` route | ✅ Page + metadata |
| `/doctor/consult/[id]` route | ✅ Dynamic consultation room page |
| `useConsultationRoom` hook | ✅ Daily.co lifecycle (join/leave/lock), `completeAppointment()` on session end |
| `apiClient.ts` | ✅ Base fetch wrapper |
| `next.config.js` | ✅ Configured |

### Mobile App — Expo React Native 50
| Screen | Role | Status |
|---|---|---|
| `LoginScreen` | All | ✅ JWT auth, role-based redirect |
| `RoleSelectScreen` | All | ✅ Dev mode role picker |
| `AuthScreen` | All | ✅ Auth entry point |
| `RecipientDashboard` | Patient | ✅ Appointment ActionCards, medication alerts, join call CTA |
| `SponsorDashboard` | NRI Sponsor | ✅ Parent's appointments, medication summary, book appointment, view prescription |
| `BookAppointmentScreen` | Sponsor | ✅ POST /api/v1/appointments form |
| `ConsultationScreen` | Patient/Doctor | ✅ Daily.co session, timer, mute/camera toggles, participant count |
| `DoctorDashboardScreen` | Doctor | ✅ Today's queue |
| `DoctorAppointmentsScreen` | Doctor | ✅ Appointment list |
| `DoctorPatientsScreen` | Doctor | ✅ Patient list |
| `DoctorNotesScreen` | Doctor | ✅ SOAP note entry |
| `DoctorProfileScreen` | Doctor | ✅ Profile |
| `SoapNoteScreen` | Doctor | ✅ Structured SOAP form |
| `PrescriptionUploadScreen` | Doctor | ✅ S3 PDF upload |
| `PatientHomeScreen` | Patient | ✅ Home feed |
| `PatientAppointmentsScreen` | Patient | ✅ Appointment list |
| `PatientChatScreen` | Patient | ✅ Chat placeholder |
| `PatientPharmacyScreen` | Patient | ✅ Pharmacy view |
| `PatientProfileScreen` | Patient | ✅ Profile |
| `MedicationListScreen` | Pharmacy/Patient | ✅ Medication inventory |
| `PharmacyRxQueueScreen` | Pharmacy | ✅ Rx queue |
| `PharmacyOrdersScreen` | Pharmacy | ✅ Orders |
| `PharmacyCatalogScreen` | Pharmacy | ✅ Catalog |
| `PharmacyProfileScreen` | Pharmacy | ✅ Profile |
| `PharmacistPrescriptionQueueScreen` | Pharmacy | ✅ Full queue with SLA |
| `ActionCard` component | All | ✅ High-contrast sticky CTA card |
| `useMedicationAlerts` hook | Pharmacy | ✅ Days remaining + urgency |

### Shared Library (`@preventia/shared`)
| Item | Status |
|---|---|
| `ApiClient` class | ✅ Platform-agnostic, bearer token, typed errors |
| `getAppointments`, `completeAppointment` | ✅ |
| `getMedications` | ✅ |
| `useAuth` hook | ✅ |
| `useDailySession` hook | ✅ Web SDK (@daily-co/daily-js) |
| TypeScript types (AuthUser, Appointment, Medication, etc.) | ✅ Synced with backend DTOs |

### Infrastructure
| Item | Status |
|---|---|
| Podman Compose stack (postgres, redis, app) | ✅ Running |
| DB migrations (V1–V7) | ✅ Applied cleanly |
| `.env.example` with all secrets documented | ✅ |
| Neo-Brutalist theme (`theme.ts`) | ✅ |

---

## 🔄 WORK IN PROGRESS

| Item | What Exists | What's Missing |
|---|---|---|
| **Auth guards on web routes** | Routes exist | `TODO` comments on `/doctor` and `/pharmacist` — no session/cookie auth check. Anyone can hit them |
| **Daily.co real tokens** | Room provisioning code exists | `DAILY_API_KEY` env var needed; currently calls may return mock/fail |
| **Video tile rendering** | `ConsultationRoom.tsx` has `frameRef` + callObject | Daily.co `createFrame()` not yet called on the `div` — video won't actually display |
| **Chat (Stream Chat)** | `PatientChatScreen.tsx` exists | Body is a placeholder — no Stream Chat SDK integrated yet |
| **Root homepage** | Hardcoded redirect to `/doctor` | Needs role-based routing post-auth |
| **Sponsor web portal** | Mobile has `SponsorDashboard` | No web equivalent — no `/sponsor` route in `web-app` |
| **Health Coach portal** | Referenced in mockups | Not started anywhere |

---

## ❌ PENDING (Not Yet Started)

### PRD Requirements Not Implemented

| Feature | PRD Reference | Notes |
|---|---|---|
| **Stream Chat integration** | §4 — "text chat between Patient↔Doctor and Patient↔Pharmacy" | `PatientChatScreen` is a shell; no Stream SDK, no backend chat endpoints |
| **ABHA / NRI profile fields** | V2 DB migration exists | No UI for ABHA ID entry, no backend validation against ABDM |
| **Razorpay live payment flow** | §4 — "Razorpay (UPI/INR)" | `RazorpayGatewayService` is a stub — no real API calls, no webhook handler, no UPI redirect |
| **Stripe live payment flow** | §4 — "Stripe (USD for NRI)" | `StripeGatewayService` is a stub — no webhook, no 3DS |
| **Thyrocare lab ordering** | §4 via `ThyrocareApiService` | Stub only — no real Thyrocare API credentials or live call |
| **Auth guard middleware** | §5 / Security | Web app has no auth guards; mobile has `useAuth` but no token refresh |
| **Role-based web routing** | §3 personas | Web root redirects to `/doctor`; Sponsor and Recipient have no web portal |
| **Doctor Coach/Wellness portal** | Mockup: "Health coach Wellness session" | Zero implementation — no routes, no screens |
| **Sponsor web portal** | Mockup: "Provider — Coach Portal" | Mobile only; no Next.js pages |
| **PDF Prescription view (Patient)** | §4 — "PDF Shortcut" | S3 upload works; pre-signed URL download in PharmacistQueue works; **patient-side view not wired** |
| **Push notifications** | Implied by §4 alerts | No FCM/APNs setup, no backend push endpoint |
| **Token refresh / session expiry** | §6 Safety Rails | JWT is 24h; no refresh token endpoint or client-side refresh |
| **AWS Secrets Manager integration** | application.yml references `${JWT_SECRET}` | Works via env var but no actual Secrets Manager SDK call |
| **Data residency enforcement** | §6 — "AWS Mumbai ap-south-1" | S3Config sets region, but no Cognito/RDS/Redis region pinning |
| **Stale task lock (12h)** | §6 — "Tasks not completed within 12 hours" | `PrescriptionSlaScheduler` covers 4h SLA; 12h stale lock not implemented |
| **E2E tests** | — | Only `ConsultationScreen.test.tsx` (smoke test); no integration or E2E tests |
| **CI/CD pipeline** | — | No GitHub Actions, no build pipeline |
| **`healthcare-mvp-mobile/` cleanup** | — | Old directory superseded by `mobile-app/` — still on disk, causes confusion |

---

## Summary Scorecard

| Layer | Progress |
|---|---|
| **Backend API** | ~80% — all modules scaffolded and running; payment/lab/chat are stubs |
| **Web App (Next.js)** | ~55% — Doctor + Pharmacist portals built; no auth guards, no Sponsor/Coach |
| **Mobile App (Expo)** | ~70% — all 3 roles have screens; chat is placeholder, payment not wired |
| **Shared Library** | ~75% — types + API client solid; missing lab/payment/chat API calls |
| **Infrastructure** | ~65% — runs locally on Podman; prod infra (AWS, CI/CD) not started |
| **Overall MVP** | ~68% complete |

---

## Recommended Next Steps (Priority Order)

1. **Clean up `healthcare-mvp-mobile/`** — delete the old directory, it conflicts with `mobile-app/`
2. **Wire auth guards** — Next.js middleware for `/doctor` and `/pharmacist` routes
3. **Fix video rendering** — call `Daily.createFrame()` in `ConsultationRoom.tsx` to actually show video tiles
4. **Stream Chat** — integrate `stream-chat-react` in web; `stream-chat-expo` in mobile
5. **Razorpay live** — complete the webhook + UPI redirect flow (highest revenue path)
6. **Sponsor web portal** — add `/sponsor` Next.js page (NRI users are on desktop)
7. **Token refresh** — add `/api/v1/auth/refresh` endpoint + client-side auto-refresh
