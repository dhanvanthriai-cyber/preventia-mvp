# SPRINT-01 — Video Rendering + Auth Guards + JWT Refresh
**Agent:** eng | **Priority:** 🔴 CRITICAL | **Estimated time:** 2.5h
**Status:** ⬜ NOT STARTED
**Depends on:** Nothing — run this first

---

## Context

- Backend: Spring Boot 3.x on Podman → http://localhost:8080 (health: UP)
- Web: Next.js 14 → eng/web-app/
- Mobile: Expo RN 50 → eng/mobile-app/
- Shared lib: eng/shared/ (@preventia/shared)

---

## TASK 1 — Fix Daily.co video tile rendering (web)

**Files to edit:**
- `eng/web-app/src/components/ConsultationRoom.tsx`
- `eng/web-app/src/hooks/useConsultationRoom.ts`

**Problem:** `callObject` is created via `Daily.createCallObject()` but never attached to the DOM div. The `frameRef` div exists but video never renders.

**Fix:**
- In `useConsultationRoom.ts`, after `createCallObject()`, call `callObject.startCamera()` to initialize media devices
- In `ConsultationRoom.tsx`, when `roomStatus` transitions to `ACTIVE`, attach the call iframe to `frameRef.current` using:
  ```js
  Daily.createFrame(frameRef.current, {
    url: roomUrl,
    token: doctorToken,
    showLeaveButton: false,
    showFullscreenButton: true
  })
  ```
- Guard with a ref flag to prevent double-init if `createFrame` is called twice
- When `roomStatus === LOCKED` or `leave()` is called, destroy the frame:
  ```js
  frameRef.current?.querySelector('iframe')?.remove()
  ```
- Add error handling for camera/mic permission denial — show a styled banner using existing `styles.errorBanner`

**Done when:** Video area renders the Daily.co iframe when status is ACTIVE.

---

## TASK 2 — Next.js auth middleware + login page (web)

**Files to create:**
- `eng/web-app/src/middleware.ts`
- `eng/web-app/src/app/login/page.tsx`
- `eng/web-app/src/app/login/LoginForm.tsx`
- `eng/web-app/src/lib/auth.ts`

**Files to edit:**
- `eng/web-app/src/app/layout.tsx` (add Login/Logout link to nav)

**Rules:**
- `middleware.ts` — protect `/doctor`, `/pharmacist`, `/sponsor` routes; redirect to `/login` if no JWT cookie named `preventia_token`
- `LoginForm.tsx` — calls `POST http://localhost:8080/api/v1/auth/login` with `{ email, password }`; on success stores JWT in cookie (`httpOnly: false`, `SameSite=Lax`) and redirects by role:
  - `DOCTOR` → `/doctor`
  - `PHARMACIST` → `/pharmacist`
  - `SPONSOR` → `/sponsor`
  - `RECIPIENT` → `/` (show "Use the mobile app" message)
- `auth.ts` — exports: `getTokenFromCookie()`, `getUserFromToken()` (decode JWT payload, no verify), `clearToken()`
- `LoginForm` must match Neo-Brutalist aesthetic: black border, monospace font, 0 border-radius — consistent with `DoctorDashboard.tsx`

---

## TASK 3 — JWT refresh endpoint (backend)

**Files to create:**
- `eng/src/main/java/com/preventia/auth/domain/RefreshToken.java`
- `eng/src/main/java/com/preventia/auth/repository/RefreshTokenRepository.java`
- `eng/src/main/java/com/preventia/auth/service/RefreshTokenService.java`
- `eng/src/main/java/com/preventia/auth/dto/RefreshRequest.java`
- `eng/src/main/java/com/preventia/auth/dto/RefreshResponse.java`
- `eng/src/main/resources/db/migration/V8__refresh_tokens.sql`

**Files to edit:**
- `eng/src/main/java/com/preventia/auth/controller/AuthController.java` (add `POST /api/v1/auth/refresh`)
- `eng/src/main/java/com/preventia/shared/config/SecurityConfig.java` (whitelist `/api/v1/auth/refresh`)

**Rules:**
- `RefreshToken` entity: `id` (UUID), `userId` (FK → users), `token` (UUID as VARCHAR), `expiresAt` (Instant, 30 days), `createdAt`
- `POST /api/v1/auth/login` must now also return `refreshToken` alongside the JWT
- `POST /api/v1/auth/refresh` accepts `{ refreshToken: string }` → validates against DB → returns new JWT + new refreshToken (rotation pattern)
- Expired or unknown refresh tokens → HTTP 401
- V8 migration:
  ```sql
  CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```

---

## Completion Checklist

- [ ] `ConsultationRoom` renders Daily.co iframe when ACTIVE
- [ ] `/login` page works, redirects by role
- [ ] `/doctor`, `/pharmacist`, `/sponsor` redirect to `/login` when no cookie
- [ ] `POST /api/v1/auth/refresh` returns 200 with new tokens
- [ ] `POST /api/v1/auth/login` returns `refreshToken` field
- [ ] V8 migration applied cleanly
- [ ] Backend still starts: `curl http://localhost:8080/actuator/health` → `{"status":"UP"}`

## Commit

```bash
git config --local user.name "preventia ai"
git config --local user.email "preventia.ai@gmail.com"
git add -A
git commit -m "feat(auth+video): Daily.co frame rendering, Next.js auth guards, JWT refresh endpoint"
git push origin main
```

