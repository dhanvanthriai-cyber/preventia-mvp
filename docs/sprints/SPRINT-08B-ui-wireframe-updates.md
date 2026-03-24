# SPRINT-08B — UI Wireframe Updates
**Agent:** eng | **Priority:** 🟠 HIGH | **Estimated time:** 6h
**Status:** ⬜ NOT STARTED
**Depends on:** SPRINT-08 ✅

---

## Context

The owner has updated the wireframes in `mockups/wireframes/`. This sprint aligns the
web-app UI to match those wireframes exactly. It also removes redundant auth pages.

Wireframes to implement:
- `mockups/wireframes/patient/recepient-dashboard.png` — full multi-card patient hub
- `mockups/wireframes/doctor/provider-dashboard.png` — provider command centre
- `mockups/wireframes/doctor/profile-creation.png` — 3-step provider credentialing form
- `mockups/wireframes/doctor/video-call.png` — live encounter screen (verify alignment only)

Reference for auth flow:
- `mockups/wireframes/patient/landing.png` — P360 branded signup (already matches LandingAuthPortal)
- `mockups/wireframes/patient/member-registration.png` — add family (already matches AddFamilyMemberForm)
- `mockups/wireframes/patient/family-member.png` — family hub (already matches FamilyHub)
- `mockups/wireframes/patient/service-enrollment.png` — enrollment (already matches ServiceEnrollmentForm)

All frontend files live under `eng/web-app/src/`.

---

## TASK 1 — Remove Redundant Auth Pages

**Background:**
The root `/` page already renders `LandingAuthPortal`, which handles both login and
registration in a single flow via `?mode=login` and `?mode=register` query params.
The standalone `/login` and `/signup` routes are duplicates that diverge from the P360
design and create maintenance debt. Remove them and redirect to the canonical `LandingAuthPortal`.

**Files to delete:**
```
eng/web-app/src/app/login/page.tsx
eng/web-app/src/app/login/LoginForm.tsx
eng/web-app/src/app/signup/page.tsx
eng/web-app/src/app/signup/SignupForm.tsx
```

**Replace each route with a redirect page:**

`eng/web-app/src/app/login/page.tsx` → replace file content with:
```tsx
import { redirect } from 'next/navigation';
export default function LoginRedirect({ searchParams }: { searchParams: Record<string, string> }) {
  const role = searchParams.role ? `&role=${searchParams.role}` : '';
  const next = searchParams.next ? `&next=${searchParams.next}` : '';
  redirect(`/?mode=login${role}${next}`);
}
```

`eng/web-app/src/app/signup/page.tsx` → replace file content with:
```tsx
import { redirect } from 'next/navigation';
export default function SignupRedirect({ searchParams }: { searchParams: Record<string, string> }) {
  const role = searchParams.role ? `&role=${searchParams.role}` : '';
  redirect(`/?mode=register${role}`);
}
```

Delete `LoginForm.tsx` and `SignupForm.tsx` entirely (no longer imported anywhere after this).

**Verify:** Search for any remaining imports of `LoginForm` or `SignupForm` and remove them.

**Acceptance Criteria:**
- [ ] `/login` redirects to `/?mode=login` (preserving role and next params)
- [ ] `/signup` redirects to `/?mode=register` (preserving role param)
- [ ] `LoginForm.tsx` and `SignupForm.tsx` files deleted
- [ ] No remaining imports of the deleted files

---

## TASK 2 — Patient Dashboard Redesign (recepient-dashboard.png)

**File to update:** `eng/web-app/src/components/PatientDashboard.tsx`

**Current state:** Tabbed interface with 6 tabs (Today, Appointments, Medicines, Records, History, Messages).

**Target state:** Multi-card grid dashboard with profile hero + 3-column card layout, matching the wireframe exactly.

### Profile Hero Section
Replace the current header with:
- Large avatar with initials (first + last name)
- Full name + subtitle: `PRIMARY ACCOUNT HOLDER · {age}Y · {gender}`
- Three pill tags: blood type (e.g. `O POSITIVE`), BMI, allergies count (`ALLERGIES: {n} ACTIVE`)
- Top-right: red-outlined `🚨 EMERGENCY SOS` button — wire to the existing `EmergencyButton` component (from SPRINT-08)
- Two black filled CTA buttons: `BOOK LAB TEST` (links to `/patient/book?type=lab`) and `BOOK VIRTUAL CONSULTATION` (links to `/patient/book`)
- Top nav: back arrow + breadcrumb `PROFILE DASHBOARD: {NAME}`, and `FAMILY OVERVIEW` button (links to `/patient`) and `SAVE CHANGES` button

### Card Grid Layout
3-column CSS grid below the hero. Use `display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;` at desktop, collapsing to 1 column on mobile.

**LEFT column — 3 cards:**

**Card: Virtual Consultation**
- Header: `VIRTUAL CONSULTATION` + `HISTORY ›` link (→ `/patient/history`)
- Video placeholder block (dark bg, label `[ VIRTUAL HALL FEED ]`)
- Next appointment: `NEXT: Dr. {doctorName}` + `Starts in {timeUntil}` + `JOIN MEETING` button (black filled, links to `/patient/consult/{appointmentId}`)
- If no upcoming appointment: show `No upcoming consultation` placeholder

**Card: Snapshot of Vitals**
- Header: `SNAPSHOT OF VITALS` + `DEVICES ›` link (→ `/patient/health`)
- For each vital in `MOCK_VITALS` (keep existing mock data): label + value + a simple inline sparkline bar (CSS div, width proportional to value %, colour green/amber/red based on thresholds)
- Add `GLUCOSE` and `BLOOD PRESSURE` to mock vitals (glucose: 141 mg/dL, BP: 130/78)
- Status badge `GOOD` (green) next to Heart Rate
- Show `SPO2: 98%` row

**Card: Health Insights**
- Header: `HEALTH INSIGHTS` + `NEWSROOM ›` link
- One hardcoded article card: green `NEW RESEARCH` tag + title `ADVANCED GLUCOSE MONITORING TECHNIQUES` + `READ FULL ARTICLE →` link

**CENTER column — 3 cards:**

**Card: Upcoming Sessions**
- Header: `UPCOMING SESSIONS` + `SCHEDULE ›` link (→ `/patient/book`)
- Map first 2 upcoming appointments from live API data (already fetched in component)
- Each row: session type label + time (e.g. `CONFIRMED 10 AM`) + `JOIN` button (black filled) or `TRACK` button (outlined) depending on type
- If no appointments: placeholder row

**Card: Provider Chat**
- Header: `PROVIDER CHAT` + `FULL SCREEN CHAT ›` link (→ active consultation if exists)
- Embed existing `ChatPanel` component (already imported), constrained height `260px`
- Keep existing dynamic import with `ssr: false`

**Card: Active Prescriptions**
- Header: `ACTIVE PRESCRIPTIONS` + `PHARMACY ›` link
- Map `MOCK_PRESCRIPTIONS` where `status === 'ACTIVE'`
- Each row: drug name + `ACTIVE` green badge + `REFILL REQUESTED` outlined button (disabled/static for now)

**RIGHT column — 3 cards:**

**Card: Medical Billing**
- Header: `MEDICAL BILLING` + `FINANCIALS ›` link
- Static mock: `TOTAL ANNUAL SPEND (YTD)` label + large `₹ 14,200.00`
- Two line items: `PHARMACY BILL OCT → ₹ 350.00` and `LAB INVOICE #003 → Pending` (red text)
- `REVIEW ALL STATEMENTS` outlined button (static/disabled for now)

**Card: Vaulted Records**
- Header: `VAULTED RECORDS` + `VAULT ›` link
- Two static rows: `ANNUAL PHYSICAL 2023 PDF` + `VIEW` link; `BLOOD PANEL OCT PDF` + `VIEW` link
- `ADD RECORD` outlined button (static/disabled)

**Card: Clinical History**
- Header: `CLINICAL HISTORY` + `FULL HISTORY ›` link
- Map `MOCK_CONDITIONS`: name + tag pill (using existing `pill()` helper) + `since` date

**Acceptance Criteria:**
- [ ] Profile hero with avatar, pills, EMERGENCY SOS, and two booking CTAs
- [ ] 3-column grid with all 9 cards rendered
- [ ] Virtual Consultation card shows next appointment or placeholder
- [ ] Vitals card shows all 6 vitals with inline status colour
- [ ] Provider Chat embeds ChatPanel
- [ ] Layout collapses to single column on mobile (`< 768px`)
- [ ] Emergency SOS button uses existing `EmergencyButton` component

---

## TASK 3 — Doctor Dashboard Redesign (provider-dashboard.png)

**File to update:** `eng/web-app/src/components/DoctorDashboard.tsx`

**Current state:** Simple feed + ChatPanel layout.

**Target state:** Multi-card command centre matching wireframe.

### Profile Hero Section
- Avatar with initials (`SV` etc.)
- Name + subtitle: `{specialty} · {credentials}`
- Tag: `SET HEALTH SPECIALTIES` pill (links to `/doctor/profile`)
- Online indicator: green dot + `PROVIDER PORTAL: {NAME}` in header
- `EDIT PROFILE` black filled button (links to `/doctor/profile`)
- `SIGN OUT` link top-right (calls existing logout/clear token flow)

### Card Grid: 3 columns

**LEFT column — 2 cards:**

**Card: Pending Requests**
- Header: `PENDING REQUESTS`
- Fetch from `GET /api/v1/appointments?status=SCHEDULED` (already available)
- For each pending item: show patient name + request description (appointment type + date) + `APPROVE` (black filled, calls `PUT /api/v1/appointments/{id}/status` → ACTIVE) + `DECLINE` (outlined, calls cancel endpoint)
- If empty: `No pending requests` placeholder

**Card: In-Network Chat**
- Header: `IN-NETWORK CHAT`
- Two-pane layout:
  - Left mini-list (`120px` wide): render up to 4 recent chat contacts from existing `ChatPanel` state/props — name abbreviated + green dot if online
  - Right: embed existing `ChatPanel` component
- Height capped at `360px`, overflow scroll

**CENTER column — 2 cards:**

**Card: Post New Insight**
- Header: `POST NEW INSIGHT`
- Form with:
  - `CATEGORY` — `<select>` with options: Nourishment, Mindset, Movement, Sleep, General
  - `CONTENT TITLE` — text input
  - `BODY TEXT` — textarea (4 rows)
  - Two buttons: `ADD MEDIA` (outlined, static/disabled) + `POST TO FEED` (black filled)
- On submit: `POST /api/v1/insights` with `{ category, title, body }` — if endpoint doesn't exist yet, mock with `console.log` and show a success toast

**Card: Lifestyle Insights Feed**
- Header: `LIFESTYLE INSIGHTS`
- Render `MOCK_FEED` (existing in component) as cards:
  - Category tag (green pill) + title (bold) + body (muted text)
  - `LIKE ♥` and `SHARE ↗` ghost buttons
- Scroll if more than 2 items

**RIGHT column — 4 cards:**

**Card: Upcoming Consultation Sessions**
- Header: `UPCOMING CONSULTATION SESSIONS`
- Fetch first upcoming appointment from `getAppointments()` (already imported)
- Row: time + date + `VIEW PATIENT PROFILE` link (→ `/doctor/patient/{patientId}`) + `START` black filled button (→ `/doctor/consult/{id}`)

**Card: Hourly Rate**
- Header: `PROFESSIONAL FEE PER SESSION`
- Display: `₹ {rate}` in large text — default 2500
- `<input type="number">` to edit
- `UPDATE HOURLY RATE` red/dark filled button — calls `PUT /api/v1/doctors/me/rate` with `{ rateInr: number }` — if endpoint doesn't exist mock with toast

**Card: Consultation Revenue**
- Header: `CONSULTATION REVENUE`
- Static mock: `PAYMENTS UNTIL {today's date}` + large `₹ 82,500`
- One line item: patient name + amount

**Card: Availability Settings**
- Checkbox: `ACCEPTING REQUESTS` — calls `PUT /api/v1/doctors/me/availability` on toggle; default checked

**Acceptance Criteria:**
- [ ] Profile hero matches wireframe (name, specialty, online dot, edit button)
- [ ] Pending Requests card with approve/decline
- [ ] In-Network Chat with two-pane layout
- [ ] Post New Insight form functional (with mock fallback)
- [ ] Lifestyle Insights feed renders
- [ ] Upcoming sessions + START button wired to consult route
- [ ] Hourly Rate card with editable input
- [ ] Availability toggle

---

## TASK 4 — Provider Profile Page Update (profile-creation.png)

**File to update:** `eng/web-app/src/components/DoctorProfilePage.tsx`

**Current state:** Basic profile editing form.

**Target state:** 3-step credentialing form matching wireframe.

### Layout
Full-width form with visible step headers. All steps visible on one page (single scroll, no multi-page wizard).

**STEP 01 — IDENTITY**
- Profile photo upload: dashed-border square `120×120px`, `UPLOAD PROFESSIONAL PHOTO` label, `<input type="file" accept="image/*">` behind it — on select, show preview (use `URL.createObjectURL`)
- `FULL LEGAL NAME` — pre-filled from `user.name`
- `PROFESSIONAL TITLE` — text input (e.g. `MD, Cardiology`)
- `CLINICAL BIO` — textarea (`5 rows`), placeholder `Describe your experience and care philosophy…`

**STEP 02 — CREDENTIALS**
- `MEDICAL LICENSE / NPI NUMBER` — text input
- `ISSUING AUTHORITY / STATE` — text input, placeholder `e.g. Medical Council of India`
- `YEAR OF GRADUATION` — text input (number type, `min="1950" max={currentYear}`)
- `PRIMARY LANGUAGE(S)` — text input, placeholder `English, Hindi…`

**STEP 03 — CLINICAL SETTINGS**
- `VIRTUAL CONSULTATION RATE (INR)` — number input, placeholder `1500`
- `DIGITAL SIGNATURE` — signature capture using `<canvas>` element:
  - Mouse/touch draw on canvas → stores as base64 PNG
  - `CLEAR SIGNATURE` button resets canvas
  - Minimal implementation: attach `mousedown`/`mousemove`/`mouseup` and `touchstart`/`touchmove`/`touchend` to canvas via `useEffect` + `useRef`

**Action buttons (bottom)**
- `SUBMIT PROFILE FOR REVIEW` — large full-width black filled button
  - Calls `PUT /api/v1/doctors/me/profile` with all form data (or `POST` if no profile yet)
  - On success: show success banner `Profile submitted. Verification takes up to 48 business hours.`
- `SAVE DRAFT` — outlined button, saves to `localStorage` as `doctor_profile_draft`
- Disclaimer text below buttons: `Verification can take up to 48 business hours. HIPAA compliance and privacy standards apply.`

**Acceptance Criteria:**
- [ ] 3 clearly labelled steps on one scrollable page
- [ ] Photo upload with preview
- [ ] Digital signature canvas with clear button
- [ ] Submit calls API (graceful error handling if 4xx/5xx)
- [ ] Save Draft persists to localStorage

---

## TASK 5 — Verify Live Encounter Screen (video-call.png)

**File to inspect:** `eng/web-app/src/components/ConsultationRoom.tsx`

The wireframe shows:
- 2×2 video grid (Patient, Self, Alice/family, Waiting slot)
- Real-time vitals overlay (HR, Glucose, BP) on video area
- SOAP Notes panel on the right with tabs (SOAP NOTES, PRESCRIPTION, ALERTS)
- `SIGN & COMPLETE ENCOUNTER` button (red/dark)
- `MUTE BURST` button top-right
- `RECORDING` indicator with elapsed timer

**Tasks:**
1. Confirm `ConsultationRoom.tsx` renders a 2×2 video grid using Daily.co tiles — if it only shows a single tile, add CSS grid wrapping `DailyVideo` components: `display: grid; grid-template-columns: 1fr 1fr; gap: 8px`
2. Add a vitals overlay bar at the bottom-left of the video grid: static mock values `HR: 72 | Glucose: 141 ⚠ | BP: 115/76` using absolute positioning
3. Confirm SOAP Notes panel exists with all 4 SOAP fields (S, O, A, P) — add any missing fields
4. Add a `RECORDING` indicator with elapsed timer in the header: use `useEffect` + `setInterval` to increment seconds from session join time; format as `HH:MM:SS`; red dot `●` before it
5. Confirm `SIGN & COMPLETE ENCOUNTER` button exists and calls the existing complete-consult API

**Acceptance Criteria:**
- [ ] 2×2 video grid layout
- [ ] Vitals overlay on video area
- [ ] All 4 SOAP fields present
- [ ] Recording timer counting from join
- [ ] Sign & Complete button present

---

## Commit instructions

Commit after each task:
```bash
git config --local user.name "preventia ai"
git config --local user.email "preventia.ai@gmail.com"
git commit -m "feat(sprint-08b): {TASK-DESCRIPTION}"
```

Final push after all tasks:
```bash
git push origin main
```

Suggested commit messages:
- `feat(sprint-08b): remove redundant /login and /signup pages, redirect to LandingAuthPortal`
- `feat(sprint-08b): patient dashboard — multi-card grid layout matching recepient-dashboard wireframe`
- `feat(sprint-08b): doctor dashboard — command centre layout matching provider-dashboard wireframe`
- `feat(sprint-08b): doctor profile — 3-step credentialing form with signature capture`
- `feat(sprint-08b): consultation room — 2x2 video grid, vitals overlay, recording timer`
