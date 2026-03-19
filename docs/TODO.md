# Dhanvanthri MVP — TODO Tracker

## Sprint: UI Refactor + Merge Resolution

### ✅ Completed This Session
- [x] `git pull origin main` — clean fast-forward to `f07fd4b` (no merge conflicts)
- [x] Appointment State Machine verified intact (SCHEDULED → ACTIVE → COMPLETED / LOCKED)
- [x] UI 3-layer scaffold initiated: `mobile-app/`, `web-app/`, `shared/`

### 🔄 In Progress
- [ ] `refactor(ui)` — sub-agent executing directory scaffold + shared extraction + Next.js web-app stub

### ⏳ Pending (this session)
- [ ] Update imports in `mobile-app/` screens → `@dhanvanthri/shared`
- [ ] Port DoctorDashboard + PharmacistQueue to `web-app/` (HTML, no RN)
- [ ] Verify `eng/shared/src/types/index.ts` mirrors backend AppointmentStatus enum

### 🔒 Backlog (future sessions)
- [ ] Doctor Portal pixel-match (5 mockups not yet built)
- [ ] ABDM sandbox credentials (NHA — long-lead, human action)
- [ ] Daily.co webhook URL registration (human action)
- [ ] Env vars: DAILY_API_KEY, AWS keys, Stripe, Razorpay (human action)
- [ ] V2 migration reconciliation (`add_user_abha_nri_fields` in `eng/db/` vs `resources/`)
- [ ] Spring Boot app startup verification
