# Patient Navigation — Full Rollout Plan
**Version:** 1.0  
**Date:** 2026-03-25  
**Author:** DirectorAlpha / @pm  

---

## Overview

Six navigation links on the Patient Dashboard (`/patient/health`) currently 404 or point to stub pages. This document defines the full implementation plan for each, maps them to existing backend capabilities, and assigns work to `@eng` and `@pm`.

Routes to implement:

| Card Link | Target Route | Status |
|---|---|---|
| DEVICES › | `/patient/health` (devices sub-view) | ❌ Route missing |
| NEWSROOM › | `/patient/news` | ❌ Route missing |
| PHARMACY › | `/patient/pharmacy` | ❌ Route missing |
| FINANCIALS › | `/patient/billing` | ❌ Route missing |
| VAULT › | `/patient/vault` | ❌ Route missing |
| FULL HISTORY › | `/patient/history` | ❌ Route missing |
| SCHEDULE › | `/patient/book` | ✅ Exists (appointment booking) |
| FULL SCREEN CHAT › | `/patient/messages` | ✅ Exists |
| HISTORY › (consult) | `/patient/history` | ❌ Same as FULL HISTORY |

---

## Section Breakdown

---

### 1. DEVICES — `/patient/health` (devices tab or `/patient/devices`)

**What the user expects:** A page to view/manage connected health devices (wearables, glucometers, BP monitors) that feed vitals into SOAP note objectives.

**Backend status:**
- No device table exists yet. Vitals are currently entered manually by doctors in the `objective` SOAP field.
- MVP scope: show a device registration UI + display a read-only feed of the latest vitals parsed from SOAP notes.

**@eng tasks:**
- Create `GET /api/v1/patients/me/vitals-history` — returns last 10 SOAP notes' `objective` fields with timestamps (reuse `PatientDashboardController`)
- Create `/patient/devices` Next.js page (server component, RECIPIENT auth guard)
- Create `PatientDevicesPage` client component:
  - Section 1: Vitals trend — table/list of vitals parsed from all SOAP objective fields (same `parseVitalsFromObjective` logic)
  - Section 2: "Add Device" placeholder card (disabled button — V2 feature)
  - Section 3: Manual entry note ("Your doctor records vitals during each consultation")

**@pm tasks:**
- Update `PatientDashboard.tsx` — change `DEVICES ›` link from `/patient/health` to `/patient/devices`
- Acceptance criteria: page renders with vitals history or "No vitals recorded yet"; no 404

**Complexity:** Low  
**Estimated effort:** 2–3h eng, 30m pm

---

### 2. NEWSROOM — `/patient/news`

**What the user expects:** A curated health news/articles feed relevant to their conditions (derived from clinical history).

**Backend status:**
- No news table exists. MVP scope: static curated articles or a public health RSS feed.

**@eng tasks:**
- Create `/patient/news` Next.js page (server component, RECIPIENT auth guard)
- Create `PatientNewsPage` client component:
  - Fetch public Open FDA or NCBI health news via a server-side proxy route `GET /api/news?conditions=...` (or use `web_fetch` pattern)
  - Fallback: 4–6 hardcoded article cards with real external URLs (WHO, NIH, CDC)
  - Filter by patient's top condition keywords if SOAP history is available (pass via server props)
- No new backend Spring Boot endpoints needed

**@pm tasks:**
- Define the 6 seed article topics (based on common conditions: diabetes, hypertension, allergies)
- Acceptance criteria: page renders with at least 4 article cards with working external links

**Complexity:** Low  
**Estimated effort:** 2h eng, 1h pm

---

### 3. PHARMACY — `/patient/pharmacy`

**What the user expects:** Full medication list, refill status, days-remaining alerts, and refill request action.

**Backend status:**
- `medications` table exists (V2 migration)
- `GET /api/v1/patients/me/medications` being added by current eng task (live data sprint)
- Razorpay refill flow exists: `POST /api/v1/payments/razorpay/create-order` with `payment_type = MEDICATION`
- `MedicationResponse` DTO has: `id, patientId, drugName, totalQuantity, dailyDosage, unitPriceInr, daysRemaining, isRefillRequired, refillUrgency, updatedAt`

**@eng tasks:**
- Create `/patient/pharmacy` Next.js page (server component, RECIPIENT auth guard)
- Create `PatientPharmacyPage` client component:
  - Full medication list with refill urgency (CRITICAL ≤3d = red, WARNING 4–7d = amber, OK = green)
  - "Request Refill" button per medication — calls `POST /api/v1/payments/razorpay/create-order` with `{ paymentType: "MEDICATION", amountCents: med.unitPriceInr * 100, currency: "INR" }`
  - Show prescription PDF link per medication (link to `/patient/vault` for the associated SOAP note)
  - Refill confirmation modal (show amount, confirm button)
- Add `PATCH /api/v1/patients/me/medications/{id}/inventory` passthrough if self-reporting is needed (deferred to V2)

**@pm tasks:**
- Define refill flow UX: confirm refill → Razorpay order created → show order ID confirmation
- Acceptance criteria: all medications visible with urgency tags; refill button initiates payment order; errors handled gracefully

**Complexity:** Medium  
**Estimated effort:** 4–5h eng, 1h pm

---

### 4. FINANCIALS — `/patient/billing`

**What the user expects:** Full payment history, YTD spend, payment status per consultation/lab/medication, and download capability.

**Backend status:**
- `payments` table exists (V5 migration)
- `GET /api/v1/patients/me/payments` being added by current eng task
- `PaymentResponse` DTO has: `id, gateway, gatewayPaymentId, gatewayOrderId, amountCents, currency, status, paymentType, createdAt`
- `payment_type` enum: `CONSULTATION | MEDICATION | LAB_ORDER`
- `payment_status` enum: `PENDING | CAPTURED | FAILED | REFUNDED`

**@eng tasks:**
- Create `/patient/billing` Next.js page (server component, RECIPIENT auth guard)
- Create `PatientBillingPage` client component:
  - YTD spend card (sum of CAPTURED payments in current calendar year)
  - Full paginated payment table (all-time): date | type | amount | currency | status | gateway
  - Currency-aware display: INR payments in ₹, USD in $; show exchange rate if captured
  - Filter tabs: ALL / CONSULTATION / MEDICATION / LAB ORDER
  - Status badge: CAPTURED→green, PENDING→amber, FAILED→red, REFUNDED→blue
  - "Download Statement" button (disabled, V2 — PDF export)
- No new backend endpoints needed (reuse `GET /api/v1/patients/me/payments`)

**@pm tasks:**
- Define the table column order and empty-state copy
- Acceptance criteria: payment table renders all records with correct type/status/amount; YTD card is accurate

**Complexity:** Low-Medium  
**Estimated effort:** 3–4h eng, 30m pm

---

### 5. VAULT — `/patient/vault`

**What the user expects:** All uploaded documents (prescription PDFs, lab reports, insurance documents) in one place with secure view/download.

**Backend status:**
- Prescription PDFs: `soap_notes.prescription_s3_keys` (TEXT[]) — presigned URL generation via `S3Service`
- Lab reports: `lab_orders.result_pdf_key` — stored in S3 at `lab-reports/{patientId}/{externalOrderId}.pdf`
- `GET /api/v1/patients/me/prescription-records` being added by current eng task
- Lab order endpoint: currently only `POST /api/v1/lab-orders` (DOCTOR only) — no patient read endpoint exists

**@eng tasks:**
- Add `GET /api/v1/patients/me/lab-orders` to `PatientDashboardController`:
  - Query `LabOrderRepository.findByPatientIdOrderByCreatedAtDesc(patientId)`
  - Add `findByPatientIdOrderByCreatedAtDesc` to `LabOrderRepository`
  - For records with `resultPdfKey`, generate presigned URL via `S3Service`
  - Return `List<LabOrderVaultEntry>` (inline DTO or `Map<String,Object>`): `{ id, testName, labPartner, status, resultUrl, createdAt }`
- Create `/patient/vault` Next.js page (server component, RECIPIENT auth guard)
- Create `PatientVaultPage` client component:
  - Two sections: **Prescriptions** (from `/me/prescription-records`) + **Lab Reports** (from `/me/lab-orders`)
  - Each file row: icon + filename + date + VIEW button (opens presigned URL in new tab)
  - Empty state per section
  - "Upload Document" button (disabled, V2)

**@pm tasks:**
- Define file naming convention for display (strip S3 path prefix, show human-readable name)
- Acceptance criteria: prescription files from SOAP notes appear; lab report PDFs appear where available; links open correctly

**Complexity:** Medium  
**Estimated effort:** 4–5h eng, 30m pm

---

### 6. FULL HISTORY — `/patient/history`

**What the user expects:** A chronological view of all completed consultations — doctor name, date, SOAP note summary, prescription status, and link to view details.

**Backend status:**
- `GET /api/v1/appointments?recipientId={uid}` — already used in dashboard (all statuses)
- `GET /api/v1/patients/me/soap-notes` — being added by current eng task (all patient's notes)
- The two datasets need to be joined on `appointmentId`

**@eng tasks:**
- Add `GET /api/v1/patients/me/consultation-history` to `PatientDashboardController`:
  - Join appointments (COMPLETED + LOCKED statuses) with their SOAP notes
  - Return `List<ConsultationHistoryEntry>`: `{ appointmentId, doctorName, startTime, endTime, subjective, assessment, plan, prescriptionStatus, prescriptionFiles: [] }`
  - Use existing `AppointmentRepository` + `SoapNoteRepository`; no new DB queries needed
- Create `/patient/history` Next.js page (server component, RECIPIENT auth guard)
- Create `PatientHistoryPage` client component:
  - Timeline view: each completed consultation as an expandable card
  - Collapsed: doctor name + date + status badge
  - Expanded: SOAP note sections (Subjective / Assessment / Plan) + prescription download link
  - "Book Follow-Up" button on each card (links to `/patient/book?doctor={doctorId}`)

**@pm tasks:**
- Define the timeline card expanded/collapsed UX (match existing dashboard design language)
- Acceptance criteria: all COMPLETED appointments with SOAP notes appear; expand shows SOAP content; no SCHEDULED/ACTIVE appointments shown

**Complexity:** Medium  
**Estimated effort:** 5–6h eng, 1h pm

---

## Sequencing & Dependencies

```
Week A (Days 1–2)
├── FULL HISTORY    — highest user value, backend data exists
├── PHARMACY        — medication data exists, refill flow exists
└── FINANCIALS      — payment data exists, no new backend needed

Week B (Days 3–4)
├── VAULT           — needs new lab-orders patient endpoint
├── DEVICES         — needs vitals-history endpoint
└── NEWSROOM        — no backend needed, lowest risk
```

---

## New Routes Summary (all need `/patient/[route]/page.tsx` + client component)

| Route | Component | New Backend Endpoint |
|---|---|---|
| `/patient/devices` | `PatientDevicesPage` | `GET /api/v1/patients/me/vitals-history` |
| `/patient/news` | `PatientNewsPage` | None |
| `/patient/pharmacy` | `PatientPharmacyPage` | None (reuse `/me/medications`) |
| `/patient/billing` | `PatientBillingPage` | None (reuse `/me/payments`) |
| `/patient/vault` | `PatientVaultPage` | `GET /api/v1/patients/me/lab-orders` |
| `/patient/history` | `PatientHistoryPage` | `GET /api/v1/patients/me/consultation-history` |

---

## Shared Scaffolding (build once, reuse)

Create `/home/ubuntu/healthcare-mvp/eng/web-app/src/lib/patientServerPage.ts`:
- Shared server-side auth decode + redirect logic (currently duplicated across every `page.tsx`)
- Export: `getPatientUser(): AuthUser | redirect`

This removes ~30 lines of boilerplate from each new page.

---

## Acceptance Criteria (global)

- All routes require `RECIPIENT` role — redirect to `/login` if unauthenticated
- All pages use existing `AppShellFrame` wrapper if present
- Loading states shown while fetching; empty states shown when no data
- No 404s on any of the six links from the dashboard
- Design language matches existing dashboard (use `surface()`, `pill()`, `textStyles` from `designSystem.ts`)
- Git commit per section: `feat(patient-nav): add /patient/[section] page`

---

## Task Assignment

### @eng
1. Build all 6 pages + components (estimated 18–24h total across both weeks)
2. Add new backend endpoints: `vitals-history`, `lab-orders`, `consultation-history`
3. Extract shared `patientServerPage.ts` auth helper
4. One commit per page; push to `main` after each

### @pm
1. Review this plan and approve sequencing
2. Define copy for empty states on each page
3. Define seed articles for `/patient/news` (6 topics)
4. Define FULL HISTORY card expand/collapse UX in writing before eng starts that section
5. QA each page after eng delivers (check auth guard, empty states, data accuracy)
