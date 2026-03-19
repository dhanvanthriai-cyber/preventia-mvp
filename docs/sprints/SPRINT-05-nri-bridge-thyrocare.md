# SPRINT-05 — NRI Bridge + Thyrocare API Structure
**Agent:** ops | **Priority:** 🟡 MEDIUM | **Estimated time:** 3h
**Status:** ⬜ NOT STARTED
**Depends on:** SPRINT-04 committed ✅ (needs NotificationService)

---

## Context (read SOUL.md + INSTRUCTIONS.md first)

Your mandate: the NRI Bridge — when a parent in India has blood drawn, their NRI child in the US/UK gets notified immediately. Reference ops/INSTRUCTIONS.md for the cold-chain + geography focus.

---

## TASK 1 — NRI Bridge notification flow

**Files to create:**
- `eng/src/main/java/com/preventia/lab/controller/LabWebhookController.java`
- `eng/src/main/java/com/preventia/lab/service/LabResultNotificationService.java`
- `eng/mobile-app/src/screens/sponsor/LabResultsScreen.tsx`

**Files to edit:**
- `eng/src/main/java/com/preventia/lab/service/LabOrderService.java` (handle webhook status updates)
- `eng/mobile-app/src/screens/sponsor/SponsorDashboard.tsx` (add "Lab Results" section)
- `eng/src/main/java/com/preventia/shared/config/SecurityConfig.java` (whitelist `/webhooks/lab`)

**`LabWebhookController` rules:**
- `POST /webhooks/lab/thyrocare` — no JWT auth; verified by `?apiKey=` query param
- Payload: `{ orderId, status: "SAMPLE_COLLECTED" | "PROCESSING" | "RESULT_READY", resultPdfUrl? }`
- On `SAMPLE_COLLECTED`: update `LabOrder.status` → `SAMPLE_COLLECTED`, notify Sponsor:
  > "🧪 Sample collected for {recipientName} — results expected in 24–48 hours"
- On `RESULT_READY`:
  1. Download PDF from `resultPdfUrl`
  2. Re-upload to S3 under `ap-south-1` (data residency — DPDP Act 2023)
  3. Update `LabOrder.status` → `RESULT_READY`, store S3 key
  4. Notify Sponsor: "✅ Lab results ready for {recipientName} — tap to view"
- All notifications via `NotificationService.sendToUser()` (built in SPRINT-04)

**`LabResultsScreen.tsx` rules (mobile, Sponsor view):**
- List parent's lab orders with status timeline:
  `ORDERED → SAMPLE_COLLECTED → PROCESSING → RESULT_READY`
- Brutalist progress steps: filled black squares for completed, empty outlines for pending
- `RESULT_READY` row shows "VIEW PDF" button → opens S3 pre-signed URL
- Show `collection_city` and `lab_partner_name` for each order (add to `LabOrder` entity if missing — see Task 2)

---

## TASK 2 — Thyrocare API production-ready structure

**Files to edit:**
- `eng/src/main/java/com/preventia/lab/service/ThyrocareApiService.java`
- `eng/src/main/java/com/preventia/lab/domain/LabOrder.java` (add patient/geography fields if missing)

**Files to create:**
- `eng/src/main/resources/db/migration/V10__lab_order_patient_fields.sql`

**Rules:**
- Structure real HTTP call to `https://new.thyrocare.com/api/Master/GetTestData` using `RestClient`
- Auth: API key as query param `?API_KEY={apiKey}`
- `placeOrder()` builds the correct Thyrocare payload:
  ```json
  {
    "Api_key": "<apiKey>",
    "OrderId": "<labOrder.id>",
    "ProductCode": "<testCode>",
    "PatientName": "<patientName>",
    "Age": "<patientAge>",
    "Gender": "<patientGender>",
    "PinCode": "<patientPinCode>",
    "Mobile": "<patientPhone>",
    "Hc": 1,
    "AppointDate": "<scheduledDate>",
    "Slot": "M"
  }
  ```
- If `THYROCARE_API_KEY=STUB`: log payload, return stub IDs (preserve existing behavior)
- If real key set: make actual HTTP call and parse response
- Add to `LabOrder` if not present: `patientName`, `patientAge`, `patientGender`, `patientPinCode`, `patientPhone`, `collectionCity`, `labPartnerName`
- V10 migration adds these columns

---

## Completion Checklist

- [ ] `POST /webhooks/lab/thyrocare` processes all 3 status values
- [ ] Sponsor receives push notification on SAMPLE_COLLECTED and RESULT_READY
- [ ] PDF is re-uploaded to S3 ap-south-1 (data residency)
- [ ] `LabResultsScreen` shows progress timeline with city + lab partner
- [ ] V10 migration applied cleanly
- [ ] `ThyrocareApiService` uses real payload structure (stub-safe)

## Commit

```bash
git add -A
git commit -m "feat(nri-bridge): lab webhook, Thyrocare API structure, NRI notification flow"
git push origin main
```

