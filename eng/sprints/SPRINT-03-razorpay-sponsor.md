# SPRINT-03 — Razorpay Live + Sponsor Web Portal
**Agent:** eng | **Priority:** 🟠 HIGH | **Estimated time:** 4h
**Status:** ⬜ NOT STARTED
**Depends on:** SPRINT-02 committed ✅

---

## TASK 1 — Razorpay live payment flow (backend + mobile)

**Backend files to edit:**
- `eng/pom.xml` (add razorpay-java SDK)
- `eng/src/main/java/com/dhanvanthri/payment/service/RazorpayGatewayService.java` (replace stub)
- `eng/src/main/java/com/dhanvanthri/payment/controller/PaymentController.java` (add `/webhooks/razorpay`)
- `eng/src/main/resources/application.yml` (add razorpay config block)
- `eng/src/main/java/com/dhanvanthri/shared/config/SecurityConfig.java` (whitelist `/webhooks/razorpay`)

**Mobile files to create:**
- `eng/mobile-app/src/screens/sponsor/PaymentScreen.tsx`
- `eng/mobile-app/src/screens/pharmacy/PharmacyPaymentScreen.tsx`

**Mobile files to edit:**
- `eng/mobile-app/src/screens/sponsor/BookAppointmentScreen.tsx` (add payment step after booking)
- `eng/mobile-app/src/navigation/types.ts` (add PaymentScreen to Sponsor nav params)

**Backend rules:**
- Add to `pom.xml`:
  ```xml
  <dependency>
    <groupId>com.razorpay</groupId>
    <artifactId>razorpay-java</artifactId>
    <version>1.4.7</version>
  </dependency>
  ```
- `RazorpayGatewayService.createOrder(long amountPaise, String currency)` — real SDK call, returns real order ID
- `POST /webhooks/razorpay`:
  - Verify `X-Razorpay-Signature` header using `HMAC-SHA256(razorpay.webhook-secret, rawBody)`
  - On `payment.captured` event → call `paymentService.markPaid(orderId)`
  - Always return HTTP 200 (Razorpay retries on non-200)
- `application.yml` additions:
  ```yaml
  razorpay:
    api-key: ${RAZORPAY_API_KEY:STUB}
    api-secret: ${RAZORPAY_API_SECRET:STUB}
    webhook-secret: ${RAZORPAY_WEBHOOK_SECRET:STUB}
  ```
- Whitelist `/webhooks/razorpay` in `SecurityConfig` — no JWT needed, verified by HMAC

**Mobile `PaymentScreen.tsx` rules:**
- Props: `{ orderId, amount, currency, description, onSuccess, onCancel }`
- Use `react-native` WebView to open Razorpay checkout URL: `https://api.razorpay.com/v1/checkout/embedded`
- Prefill `{ name, email }` from `AuthUser`
- On success (WebView URL contains `razorpay_payment_id`) → call `onSuccess(paymentId)`
- On back press → call `onCancel()`
- Full-screen `SafeAreaView` with Neo-Brutalist header

**Wire into `BookAppointmentScreen.tsx`:**
- After successful `POST /api/v1/appointments` → navigate to `PaymentScreen` with consultation fee
- After `PaymentScreen.onSuccess` → navigate to patient home with confirmation ActionCard

---

## TASK 2 — Sponsor web portal (Next.js)

**Files to create:**
- `eng/web-app/src/app/sponsor/page.tsx`
- `eng/web-app/src/app/sponsor/book/page.tsx`
- `eng/web-app/src/components/SponsorDashboard.tsx`
- `eng/web-app/src/components/BookAppointmentForm.tsx`

**Files to edit:**
- `eng/web-app/src/app/layout.tsx` (add "Sponsor Portal" to nav)
- `eng/web-app/src/middleware.ts` (verify `/sponsor` is protected)

**`SponsorDashboard.tsx` rules:**
- `GET /api/v1/appointments?sponsorId={userId}` → parent's upcoming appointments as cards
- `GET /api/v1/patients/{recipientId}/medications/alerts` → CRITICAL/WARNING medication badges
- "Book Appointment" button → `/sponsor/book`
- "View Prescription" on completed appointments → opens S3 pre-signed PDF URL in new tab
- 3-column grid matching `DoctorDashboard.tsx` layout
- Full Neo-Brutalist aesthetic — reuse same CSS-in-JS pattern as `DoctorDashboard.tsx`

**`BookAppointmentForm.tsx` rules:**
- Port logic from `eng/mobile-app/src/screens/sponsor/BookAppointmentScreen.tsx`
- Fields: `recipientId`, `doctorId`, `startTime` (datetime-local), `endTime`
- On submit: `POST /api/v1/appointments` → show confirmation with `roomUrl`
- After booking: show Stripe stub ("Pay $X — Stripe integration coming soon")

---

## Completion Checklist

- [ ] `POST /webhooks/razorpay` verifies HMAC and returns 200
- [ ] `PaymentScreen.tsx` renders Razorpay WebView checkout
- [ ] `/sponsor` route is accessible (and auth-guarded)
- [ ] `SponsorDashboard` fetches and renders parent's appointments + med alerts
- [ ] `BookAppointmentForm` submits to backend successfully

## Commit

```bash
git add -A
git commit -m "feat(payments+sponsor): Razorpay live flow, Sponsor web portal"
git push origin main
```

