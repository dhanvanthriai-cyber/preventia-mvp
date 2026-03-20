# UI Refactor Result — `refactor(ui): scaffold 3-layer split — mobile-app, web-app, shared`

**Commit:** `92180f5` on `main`  
**Completed:** 2026-03-13

---

## Summary

Refactored the Dhanvanthri UI layer from a single `eng/healthcare-mvp-mobile/` directory into a 3-folder structure under `eng/`.

---

## Files Created

### `eng/shared/` — Platform-agnostic package (`@dhanvanthri/shared`)

| File | Purpose |
|------|---------|
| `package.json` | name: `@dhanvanthri/shared`, private, peerDep: react |
| `tsconfig.json` | strict, declaration: true, outDir: dist |
| `src/types/index.ts` | `AuthUser`, `UserRole`, `Appointment`, `AppointmentStatus` (SCHEDULED/ACTIVE/COMPLETED/LOCKED), `CreateAppointmentRequest`, `AppointmentResponse` (roomUrl, doctorToken, recipientToken, sponsorToken), `Medication`, `RefillUrgency`, `SoapNote` |
| `src/api/client.ts` | `ApiClient` class with configurable `baseUrl` + `getToken` fn, `configureApiClient()`, `getApiClient()` singleton |
| `src/api/appointments.ts` | `createAppointment`, `getAppointments`, `activateAppointment`, `completeAppointment` |
| `src/api/medications.ts` | `getMedicationAlerts` |
| `src/hooks/useAuth.ts` | Moved from `healthcare-mvp-mobile/src/hooks/useAuth.ts` |
| `src/hooks/useDailySession.ts` | Moved from `healthcare-mvp-mobile/src/screens/consultation/useDailySession.ts` |
| `src/index.ts` | Re-exports all of types/, api/, hooks/ |

### `eng/mobile-app/` — React Native / Expo app

- Full copy of `eng/healthcare-mvp-mobile/` via `cp -r`
- `package.json`: added `"@dhanvanthri/shared": "file:../shared"` to dependencies

### `eng/web-app/` — Next.js 14 web portal

| File | Purpose |
|------|---------|
| `package.json` | Next.js 14, React 18, TypeScript, `@dhanvanthri/shared` |
| `tsconfig.json` | Standard Next.js 14 config, strict |
| `next.config.js` | `transpilePackages: ['@dhanvanthri/shared']`, `NEXT_PUBLIC_API_BASE_URL` |
| `src/app/layout.tsx` | Root layout — nav bar with Doctor/Pharmacist links |
| `src/app/globals.css` | Minimal reset |
| `src/app/page.tsx` | Redirects `/` → `/doctor` |
| `src/app/doctor/page.tsx` | Doctor Portal page — renders `DoctorDashboard` |
| `src/app/pharmacist/page.tsx` | Pharmacist Portal page — renders `PharmacistQueue` |
| `src/components/DoctorDashboard.tsx` | Ported from mobile `DoctorDashboard.tsx`; uses HTML divs, CSS-in-JS, imports `getAppointments` from `@dhanvanthri/shared` |
| `src/components/PharmacistQueue.tsx` | Ported from mobile `PharmacistPrescriptionQueueScreen.tsx`; uses HTML, SLA badge, Approve/Reject/Clarify via `window.prompt` |

---

## Imports Updated (in `eng/mobile-app/`)

The following files had their relative `useAuth` / `useDailySession` imports replaced with `@dhanvanthri/shared`:

- `src/App.tsx`
- `src/screens/auth/AuthScreen.tsx`
- `src/screens/consultation/ConsultationScreen.tsx`
- `src/screens/doctor/DoctorDashboard.tsx`
- `src/screens/doctor/SoapNoteScreen.tsx`
- `src/screens/doctor/PrescriptionUploadScreen.tsx`
- `src/screens/recipient/RecipientDashboard.tsx`
- `src/screens/sponsor/SponsorDashboard.tsx`
- `src/screens/sponsor/BookAppointmentScreen.tsx`

---

## Constraints Respected

- ✅ `eng/src/` (Spring Boot backend) untouched
- ✅ `eng/healthcare-mvp-mobile/` kept in place
- ✅ `AppointmentStatus`: `SCHEDULED | ACTIVE | COMPLETED | LOCKED`
- ✅ `AppointmentResponse` includes: `roomUrl`, `doctorToken`, `recipientToken`, `sponsorToken`

---

## TODOs

1. **Auth context for web-app** — `DoctorDashboard` accepts optional `user?: AuthUser`; wire up real session (JWT cookie / NextAuth) so `user` is populated server-side.
2. **PharmacistQueue auth** — `pharmacistId` is hardcoded as `'CURRENT_USER_ID'` in approve/reject/clarify; replace once auth context exists.
3. **`eng/mobile-app/src/hooks/useAuth.ts`** — This file still exists in mobile-app (copied from original); it's now redundant since imports use `@dhanvanthri/shared`. Consider deleting it and relying solely on the shared package after validating.
4. **`eng/mobile-app/src/screens/consultation/useDailySession.ts`** — Same as above; redundant copy.
5. **`eng/mobile-app/src/screens/pharmacy/useMedicationAlerts.ts`** — Still uses local `fetch()` directly; could be refactored to use `getMedicationAlerts` from `@dhanvanthri/shared`.
6. **`eng/shared` build step** — Need to run `tsc` in `eng/shared/` and commit `dist/` (or configure consumers to transpile directly) before `npm install` works in mobile-app / web-app.
7. **Coach portal** — `/coach` route not yet created; stub out `src/app/coach/page.tsx` when Coach feature work starts.
8. **`window.prompt` in PharmacistQueue** — Replace with a proper modal dialog component for reject/clarify UX.

---

## [2026-03-13] feat(web): Doctor Portal — Neo-Brutalist UI + Daily.co + ApiClient sync

### What was done

**TASK 1 — Daily.co frontend listener (`meeting.ended` → LOCKED)**
- Created `eng/web-app/src/hooks/useConsultationRoom.ts`: React hook wrapping `@daily-co/daily-js` call object. Listens for `joined-meeting` → ACTIVE, `left-meeting` → calls `completeAppointment()` on backend then sets local status to `LOCKED`, `participant-updated` → updates count, `error` → surfaces error string.
- Created `eng/web-app/src/components/ConsultationRoom.tsx`: Doctor-side video UI with status bar (colored dot), video frame container, JOIN/END CALL/🔒 LOCKED controls, error banner. Fires `onLocked()` callback to parent on LOCKED transition.

**TASK 2 — Neo-Brutalist DoctorDashboard.tsx pixel match**
- Completely replaced `eng/web-app/src/components/DoctorDashboard.tsx` with full 3-column Provider Portal layout:
  - Black top nav bar with green online dot, portal label, LOG OUT button
  - Profile header card: black avatar with initials, DR. NAME, MD, specialty/license, badges, EDIT PROFILE PAGE button
  - Left col (25%): VIRTUAL REQUESTS (accept/decline per appointment), NETWORK section (search bar, 3 mock contacts with online dots, OPEN FULL INBOX)
  - Center col (40%): HEALTH INSIGHTS FEED, compose textarea with VIDEO/IMAGES/BROWSE/PUBLISH controls, 2 mock feed cards with green category tag + bold title + body
  - Right col (35%): TODAY'S SCHEDULE (real data from getAppointments() — ACTIVE red-border+JOIN, SCHEDULED+JOIN, COMPLETED+SOAP/Rx), FEE SCHEDULE (₹ input + SAVE RATE), PAYMENTS RECEIVED (mock weekly/monthly/pending)
  - All styles via React.CSSProperties, no Tailwind/CSS modules

**TASK 3 — ApiClient sync + .env config**
- Created `eng/web-app/.env.local.example` with `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_DAILY_DOMAIN`
- Created `eng/web-app/src/lib/apiClient.ts`: configures shared singleton at window context with `NEXT_PUBLIC_API_BASE_URL` and `localStorage.getItem('dhanvanthri_token')`
- Updated `eng/web-app/src/app/layout.tsx` to `import '../lib/apiClient'` at startup
- Created `eng/web-app/src/app/doctor/consult/[id]/page.tsx`: fetches appointment by id, renders `ConsultationRoom`, on LOCKED redirects to `/doctor?locked={id}`

**TASK 4 — @daily-co/daily-js dependency**
- Added `"@daily-co/daily-js": "^0.70.0"` to `eng/web-app/package.json` dependencies

**Commit**: `09abcf4` pushed to `origin/main`
