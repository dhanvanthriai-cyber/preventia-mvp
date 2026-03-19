# Auth — Sign Up & Sign In Workflows
**Project Preventia_** | Last updated: March 2026

This document covers the complete sign-up and sign-in flows end-to-end, from the
React/Next.js web UI through the Spring Boot API to PostgreSQL. It is the single
source of truth for the auth stack.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [User Roles](#2-user-roles)
3. [Database Schema](#3-database-schema)
4. [Sign Up Flow](#4-sign-up-flow)
5. [Sign In Flow](#5-sign-in-flow)
6. [Token Architecture](#6-token-architecture)
7. [Token Refresh Flow](#7-token-refresh-flow)
8. [Logout Flow](#8-logout-flow)
9. [Per-Request Auth (JWT Filter)](#9-per-request-auth-jwt-filter)
10. [Frontend Cookie Handling](#10-frontend-cookie-handling)
11. [Role → Portal Routing](#11-role--portal-routing)
12. [Backend Class Reference](#12-backend-class-reference)
13. [Frontend File Reference](#13-frontend-file-reference)
14. [API Reference](#14-api-reference)
15. [Security Config — Public Endpoints](#15-security-config--public-endpoints)
16. [Error Handling](#16-error-handling)
17. [Testing Auth Locally](#17-testing-auth-locally)

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                      Browser / Next.js                         │
│                                                                │
│  /login  →  LoginForm.tsx                                      │
│  /signup →  SignupForm.tsx                                     │
│                                                                │
│  Auth cookie: preventia__token (JWT, SameSite=Lax)           │
│  lib/auth.ts — setTokenCookie / getTokenFromCookie / clearToken│
└───────────────────────────┬────────────────────────────────────┘
                            │  HTTP  (proxied via next.config.js)
                            ▼
┌────────────────────────────────────────────────────────────────┐
│              Spring Boot 3  —  Port 8080                       │
│                                                                │
│  AuthController        POST /api/v1/auth/login                │
│                         POST /api/v1/auth/register            │
│                         POST /api/v1/auth/refresh             │
│                                                                │
│  AuthService            login() / register()                  │
│  RefreshTokenService    createForUser() / rotate() / revokeAll│
│  JwtTokenProvider       generateToken() / validateToken()     │
│  JwtAuthFilter          per-request Bearer validation         │
│  UserDetailsServiceImpl loadUserByUsername(email)             │
│  SecurityConfig         BCrypt, stateless JWT, CORS           │
└───────────────────────────┬────────────────────────────────────┘
                            │  JDBC (HikariCP)
                            ▼
┌────────────────────────────────────────────────────────────────┐
│              PostgreSQL 16  — port 5432                        │
│                                                                │
│  TABLE users           — credentials + role                   │
│  TABLE refresh_tokens  — rotate-on-use tokens, 30-day TTL     │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. User Roles

| Role | Backend Enum | Frontend Label | Portal URL |
|---|---|---|---|
| Doctor | `DOCTOR` | Doctor | `/doctor` |
| Pharmacist | `PHARMACIST` | Pharmacist | `/pharmacist` |
| NRI Sponsor | `SPONSOR` | Sponsor / NRI | `/sponsor` |
| Patient | `RECIPIENT` | Patient | `/patient` |

> **Important:** The role displayed in the UI (e.g. "PATIENT") is a UX label only.
> The value stored in the database and embedded in the JWT is always the backend enum
> string (e.g. `RECIPIENT`). The portal picker on `/login` and `/signup` is cosmetic —
> the **JWT returned by the backend is the authoritative source of the user's role**.

---

## 3. Database Schema

### `users` table (Flyway `V1__Initial_Schema.sql`)

```sql
CREATE TABLE users (
    id          BIGSERIAL       PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    email       VARCHAR(320)    NOT NULL UNIQUE,   -- login identifier
    password    VARCHAR(255)    NOT NULL,           -- BCrypt hash, never plaintext
    role        VARCHAR(20)     NOT NULL,           -- DOCTOR | PHARMACIST | SPONSOR | RECIPIENT
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    nri_proxy_id UUID           NULL,              -- SPONSOR only
    abha_id     VARCHAR(50)     NULL               -- RECIPIENT only (ABDM)
);
CREATE INDEX idx_users_email ON users (email);     -- primary login lookup
CREATE INDEX idx_users_role  ON users (role);      -- role-based queries
```

### `refresh_tokens` table (Flyway `V8__refresh_tokens.sql`)

```sql
CREATE TABLE refresh_tokens (
    id         UUID        PRIMARY KEY,
    user_id    BIGINT      REFERENCES users(id),
    token      VARCHAR(255) UNIQUE NOT NULL,       -- opaque UUID string
    expires_at TIMESTAMPTZ NOT NULL,               -- 30 days from creation
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Sign Up Flow

### 4.1 UI — `SignupForm.tsx` (`/signup`)

**Step 1 — Role picker**
- User selects one of: DOCTOR · PHARMACIST · SPONSOR · PATIENT
- Selection stored in `selectedRole` state (e.g. `RECIPIENT` for PATIENT)
- URL param `?role=DOCTOR` pre-selects a role (used by deeplinks)

**Step 2 — Registration form**
- Fields: Full Name, Email, Password, Confirm Password
- Client-side validation before submit:
  - Password ≥ 8 characters
  - Password === Confirm Password (live mismatch indicator)
- Role shown as a read-only chip with a **CHANGE** button

**On submit:**
```typescript
POST /api/v1/auth/register
Content-Type: application/json

{
  "name":     "Jane Doe",
  "email":    "jane@example.com",
  "password": "MyPassw0rd",
  "role":     "RECIPIENT"          // backend enum, NOT the UI label
}
```

### 4.2 Backend — `AuthController` → `AuthService`

```
AuthController.register(@Valid RegisterRequest)
  │
  ├─ Validates: @NotBlank name, @Email email, @NotBlank password, @NotNull role
  │
  └─ AuthService.register(request)
       │
       ├─ userRepo.existsByEmail(email)  → 409 Conflict if duplicate
       │
       ├─ new User()
       │    .setName(request.name())
       │    .setEmail(request.email())
       │    .setPassword(BCrypt.encode(request.password()))   ← NEVER stored plain
       │    .setRole(request.role())
       │
       ├─ userRepo.save(user)            → INSERT INTO users (...)
       │
       ├─ jwtProvider.generateToken()    → signed JWT (HS256, 24h default)
       │
       ├─ refreshTokenService.createForUser(user)  → INSERT INTO refresh_tokens
       │
       └─ return JwtResponse {
              accessToken,      // signed JWT
              tokenType: "Bearer",
              expiresInSeconds, // default 86400 (24h)
              role,             // "RECIPIENT"
              refreshToken      // opaque UUID, 30-day TTL
          }
```

**HTTP response:** `201 Created`

### 4.3 Frontend after successful register

```typescript
// 1. Store JWT in browser cookie
setTokenCookie(data.accessToken, data.expiresInSeconds ?? 86400);
// → document.cookie = "preventia_token=<jwt>; path=/; max-age=86400; SameSite=Lax"

// 2. Decode role from JWT (not from response body — JWT is authoritative)
const decoded = getUserFromToken(data.accessToken);
const role = decoded?.role ?? data.role;

// 3. Show success screen (1.2s), then redirect
setTimeout(() => router.push(rolePortalUrl), 1200);
```

### 4.4 Sign Up State Diagram

```
/signup
  │
  ▼
[Step 1: Role Picker]
  │  user clicks role
  ▼
[Step 2: Registration Form]
  │  form submit
  ▼
POST /api/v1/auth/register
  │
  ├─ 400 Bad Request  → show validation error (name/email/password missing)
  ├─ 409 Conflict     → "This email is already registered. Please sign in."
  └─ 201 Created
       │
       ▼
  [Success screen: "Welcome, Jane!"]
       │  1.2s delay
       ▼
  Redirect → /doctor | /pharmacist | /sponsor | /patient
```

---

## 5. Sign In Flow

### 5.1 UI — `LoginForm.tsx` (`/login`)

**Step 1 — Portal picker**
- Same 4 tiles as signup: DOCTOR · PHARMACIST · SPONSOR · PATIENT
- "New here? CREATE AN ACCOUNT →" link navigates to `/signup`
- `?logged_out=1` query param shows green "Signed out successfully" banner

**Step 2 — Credential form**
- Fields: Email, Password
- Button: `SIGN IN`

**On submit:**
```typescript
POST /api/v1/auth/login
Content-Type: application/json

{
  "email":    "jane@example.com",
  "password": "MyPassw0rd"
}
```

### 5.2 Backend — `AuthController` → `AuthService`

```
AuthController.login(@Valid LoginRequest)
  │
  └─ AuthService.login(request)
       │
       ├─ authManager.authenticate(
       │       UsernamePasswordAuthenticationToken(email, password)
       │   )
       │   │
       │   └─ DaoAuthenticationProvider
       │         │
       │         ├─ UserDetailsServiceImpl.loadUserByUsername(email)
       │         │    → SELECT * FROM users WHERE email = ?
       │         │    → throws UsernameNotFoundException if not found (→ 401)
       │         │
       │         └─ BCrypt.matches(inputPassword, storedHash)
       │              → throws BadCredentialsException if wrong (→ 401)
       │
       ├─ userRepo.findByEmail(email)   → load full User entity
       │
       ├─ jwtProvider.generateToken()   → signed JWT
       │
       ├─ refreshTokenService.createForUser(user)
       │
       └─ return JwtResponse { accessToken, tokenType, expiresInSeconds, role, refreshToken }
```

**HTTP response:** `200 OK`

### 5.3 Frontend after successful login

Same as registration (§4.3) — store cookie, decode role, redirect.

### 5.4 Sign In State Diagram

```
/login
  │
  ▼
[Step 1: Portal Picker]
  │  user clicks portal
  ▼
[Step 2: Credential Form]
  │  form submit
  ▼
POST /api/v1/auth/login
  │
  ├─ 401 Unauthorized  → "Login failed (HTTP 401)" error banner
  └─ 200 OK
       │
       ▼
  setTokenCookie(jwt)
       │
       ▼
  Redirect → /doctor | /pharmacist | /sponsor | /patient
```

---

## 6. Token Architecture

### Access Token (JWT)

| Field | Value |
|---|---|
| Algorithm | HS256 (HMAC-SHA256) |
| Signing key | `app.jwt.secret` env var (min 32 chars) |
| Default TTL | 24 hours (`app.jwt.expiration-ms=86400000`) |
| Storage | Browser cookie `preventia_token` |
| Cookie flags | `path=/; SameSite=Lax; max-age=86400` |

**JWT payload claims:**
```json
{
  "sub":  "jane@example.com",   // email (Spring Security principal)
  "role": "RECIPIENT",          // drives RBAC, portal routing
  "iat":  1741824000,           // issued-at (epoch seconds)
  "exp":  1741910400            // expiry (iat + 86400)
}
```

> **Note:** The JWT does NOT contain `userId` or `name` in the current implementation.
> The server-side portal pages (e.g. `/doctor/page.tsx`) decode the payload client-side
> to extract the role for routing decisions. The backend validates the signature on
> every protected request via `JwtAuthFilter`.

### Refresh Token

| Field | Value |
|---|---|
| Format | Opaque UUID string |
| TTL | 30 days |
| Storage | PostgreSQL `refresh_tokens` table |
| Rotation | Consume-once — old token deleted before new one issued |
| Revocation | All tokens for a user deleted on logout / password change |

---

## 7. Token Refresh Flow

```
Client                          Backend
  │                               │
  ├─ POST /api/v1/auth/refresh    │
  │    { "refreshToken": "uuid" } │
  │                               │
  │                               ├─ RefreshTokenService.rotate(uuid)
  │                               │    ├─ find token in refresh_tokens table
  │                               │    ├─ check expires_at > NOW()
  │                               │    ├─ DELETE old token (T1 consumed)
  │                               │    └─ INSERT new token (T2)
  │                               │
  │                               ├─ JwtTokenProvider.generateToken()
  │                               │
  │◄──────────────────────────────┤
  │  200 OK                       │
  │  { newAccessToken, newRefreshToken, expiresInSeconds }
```

If T1 is unknown or expired → `401 Unauthorized`.

---

## 8. Logout Flow

```
Browser                         Frontend (Next.js)              Backend
  │                               │                               │
  ├─ clicks LOG OUT button        │                               │
  │                               │                               │
  │  router.push('/api/logout')  ─►  GET /api/logout             │
  │  (DoctorDashboard.tsx)            (Next.js Route Handler)     │
  │                               │                               │
  │                               ├─ Set-Cookie: preventia_token=; max-age=0
  │                               │  (clears cookie server-side)
  │                               │                               │
  │◄──────────────────────────────┤                               │
  │  302 Redirect → /login?logged_out=1                           │
  │                               │                               │
  ├─ /login renders               │                               │
  │  ✓ "You have been signed out" │                               │
```

> **Note:** The refresh token in PostgreSQL is NOT deleted on web logout currently.
> The access JWT expires naturally after its TTL. To fully revoke, call
> `RefreshTokenService.revokeAll(userId)` — this is wired for future "logout all
> devices" feature.

**Files involved:**
- `eng/web-app/src/app/api/logout/route.ts` — Next.js Route Handler
- `eng/web-app/src/components/DoctorDashboard.tsx` — LOG OUT button
- `eng/web-app/src/components/PatientDashboard.tsx` — LOG OUT link

---

## 9. Per-Request Auth (JWT Filter)

Every API request to a protected endpoint passes through `JwtAuthFilter`:

```
Incoming HTTP request
  │
  ├─ Extract header: Authorization: Bearer <token>
  │
  ├─ JwtTokenProvider.validateToken(token)
  │    ├─ parse HMAC-SHA256 signature
  │    ├─ check exp claim
  │    └─ returns false → 401 (no SecurityContext populated)
  │
  ├─ getUserEmail(token)  → "jane@example.com"
  ├─ getRole(token)       → "RECIPIENT"
  │
  ├─ SecurityContextHolder.setAuthentication(
  │       UsernamePasswordAuthenticationToken(
  │           email, null, [ROLE_RECIPIENT]
  │       )
  │   )
  │
  └─ chain.doFilter()  →  controller executes with authenticated principal
```

**RBAC in controllers** uses `@PreAuthorize`:
```java
@PreAuthorize("hasRole('DOCTOR')")
public ResponseEntity<?> createSoapNote(...) { ... }
```

Spring Security maps `ROLE_DOCTOR` authority to `hasRole('DOCTOR')` automatically.

---

## 10. Frontend Cookie Handling

All cookie operations are in `eng/web-app/src/lib/auth.ts`:

```typescript
// Write JWT after login / register
setTokenCookie(token: string, expiresInSeconds: number)
// → document.cookie = "preventia_token=<enc>; path=/; max-age=N; SameSite=Lax"

// Read JWT (client components)
getTokenFromCookie(): string | null

// Decode payload WITHOUT verifying signature (UI decisions only)
getUserFromToken(token: string): DecodedToken | null
// → { sub, role, name?, exp?, iat? }

// Get current user from cookie
getCurrentUser(): DecodedToken | null

// Role → default portal URL
getDefaultRouteForRole(role: string): string
// DOCTOR → /doctor | PHARMACIST → /pharmacist | SPONSOR → /sponsor | RECIPIENT → /patient

// Clear cookie (client-side, used if needed)
clearToken(): void
```

**Server components** (e.g. `/doctor/page.tsx`) read the cookie via Next.js `cookies()`:
```typescript
const token = cookies().get('dhanvanthri_token')?.value;
```

---

## 11. Role → Portal Routing

| JWT Role | Redirect after login/signup | Protected page |
|---|---|---|
| `DOCTOR` | `/doctor` | `DoctorDashboard.tsx` |
| `PHARMACIST` | `/pharmacist` | `PharmacistQueue.tsx` |
| `SPONSOR` | `/sponsor` | `SponsorDashboard.tsx` |
| `RECIPIENT` | `/patient` | `PatientDashboard.tsx` |

Server-side role guard example (`/patient/page.tsx`):
```typescript
if (!token)           redirect('/login?next=/patient');
if (role !== 'RECIPIENT') {
  if (role === 'DOCTOR')     redirect('/doctor');
  if (role === 'PHARMACIST') redirect('/pharmacist');
  if (role === 'SPONSOR')    redirect('/sponsor');
}
```

---

## 12. Backend Class Reference

| Class | Location | Responsibility |
|---|---|---|
| `AuthController` | `auth/controller/AuthController.java` | REST endpoints: `/login`, `/register`, `/refresh` |
| `AuthService` | `auth/service/AuthService.java` | Login + register orchestration; DB writes |
| `UserDetailsServiceImpl` | `auth/service/UserDetailsServiceImpl.java` | Spring Security: load user by email |
| `RefreshTokenService` | `auth/service/RefreshTokenService.java` | Create / rotate / revoke refresh tokens |
| `JwtTokenProvider` | `shared/security/JwtTokenProvider.java` | Generate + validate HS256 JWTs |
| `JwtAuthFilter` | `shared/security/JwtAuthFilter.java` | Per-request Bearer token extraction |
| `SecurityConfig` | `shared/config/SecurityConfig.java` | BCrypt, stateless sessions, CORS, whitelist |
| `RegisterRequest` | `auth/dto/RegisterRequest.java` | Validated register payload `{ name, email, password, role }` |
| `LoginRequest` | `auth/dto/LoginRequest.java` | Validated login payload `{ email, password }` |
| `JwtResponse` | `auth/dto/JwtResponse.java` | Auth response `{ accessToken, tokenType, expiresInSeconds, role, refreshToken }` |
| `User` | `family/domain/User.java` | JPA entity mapped to `users` table |
| `RefreshToken` | `auth/domain/RefreshToken.java` | JPA entity mapped to `refresh_tokens` table |
| `UserRepository` | `auth/repository/UserRepository.java` | `findByEmail`, `existsByEmail` |

---

## 13. Frontend File Reference

| File | Path | Responsibility |
|---|---|---|
| `LoginForm.tsx` | `web-app/src/app/login/LoginForm.tsx` | Portal picker + credential form |
| `SignupForm.tsx` | `web-app/src/app/signup/SignupForm.tsx` | Role picker + registration form |
| `auth.ts` | `web-app/src/lib/auth.ts` | Cookie helpers, JWT decode, role routing |
| `logout/route.ts` | `web-app/src/app/api/logout/route.ts` | GET /api/logout — clear cookie + redirect |
| `patient/page.tsx` | `web-app/src/app/patient/page.tsx` | Server-side auth guard for RECIPIENT |
| `doctor/page.tsx` | `web-app/src/app/doctor/page.tsx` | Decodes JWT, passes user to DoctorDashboard |

---

## 14. API Reference

### `POST /api/v1/auth/register`

**Request:**
```json
{
  "name":     "Jane Doe",
  "email":    "jane@example.com",
  "password": "MyPassw0rd!",
  "role":     "RECIPIENT"
}
```
**Validation:**
- `name` — not blank
- `email` — valid email format, not blank
- `password` — not blank (min length enforced frontend-side: 8 chars)
- `role` — one of `DOCTOR | PHARMACIST | SPONSOR | RECIPIENT`

**Response `201 Created`:**
```json
{
  "accessToken":      "eyJhbGci...",
  "tokenType":        "Bearer",
  "expiresInSeconds": 86400,
  "role":             "RECIPIENT",
  "refreshToken":     "550e8400-e29b-41d4-a716-446655440000"
}
```

**Errors:**
| HTTP | Condition |
|---|---|
| `400 Bad Request` | Validation failure (missing/invalid field) |
| `409 Conflict` | Email already registered |

---

### `POST /api/v1/auth/login`

**Request:**
```json
{
  "email":    "jane@example.com",
  "password": "MyPassw0rd!"
}
```

**Response `200 OK`:** Same `JwtResponse` shape as register.

**Errors:**
| HTTP | Condition |
|---|---|
| `400 Bad Request` | Missing fields |
| `401 Unauthorized` | Wrong email or password |

---

### `POST /api/v1/auth/refresh`

**Request:**
```json
{ "refreshToken": "550e8400-e29b-41d4-a716-446655440000" }
```

**Response `200 OK`:**
```json
{
  "accessToken":      "eyJhbGci...",
  "refreshToken":     "661f9511-...",
  "expiresInSeconds": 86400
}
```

**Errors:**
| HTTP | Condition |
|---|---|
| `401 Unauthorized` | Token unknown, expired, or already consumed |

---

## 15. Security Config — Public Endpoints

The following paths are accessible **without a JWT** (`SecurityConfig.java`):

```
OPTIONS /**                       — CORS preflight
/api/v1/auth/**                   — login, register, refresh
/actuator/health                  — health check
/api/v1/webhook/daily             — Daily.co video webhook
/api/v1/webhook/lab               — Thyrocare lab webhook
/api/v1/webhook/stripe            — Stripe payment webhook
/api/v1/webhook/razorpay          — Razorpay payment webhook
/webhooks/daily                   — (alternate path)
/webhooks/razorpay                — (alternate path)
```

All other endpoints require a valid `Authorization: Bearer <jwt>` header.

---

## 16. Error Handling

### Frontend error display

| Scenario | UI Message |
|---|---|
| Wrong password / unknown email | `⚠ Login failed (HTTP 401)` |
| Email already registered | `⚠ This email is already registered. Please sign in instead.` |
| Passwords don't match (client) | `⚠ Passwords do not match.` |
| Password too short (client) | `⚠ Password must be at least 8 characters.` |
| Backend validation error (400) | `⚠ <server error message>` |
| Network / backend down | `⚠ Network error — is the backend running?` |

### Backend error mapping

Spring Security exceptions are mapped to HTTP status codes via `SecurityConfig`:
```java
.exceptionHandling(ex -> ex
    .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
)
```

`IllegalStateException("Email already registered")` → mapped to `409 Conflict` via
`@RestControllerAdvice` (global exception handler).

---

## 17. Testing Auth Locally

### Prerequisite: backend running
```bash
cd eng
podman compose up -d          # starts postgres, redis, app on :8080
```

### Register a new account via curl
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":     "Test Doctor",
    "email":    "doctor@dhanvanthri.local",
    "password": "Test@1234",
    "role":     "DOCTOR"
  }'
```

### Register a patient account
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":     "Test Patient",
    "email":    "patient@dhanvanthri.local",
    "password": "Test@1234",
    "role":     "RECIPIENT"
  }'
```

### Sign in
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":    "doctor@dhanvanthri.local",
    "password": "Test@1234"
  }'
```

### Use the returned JWT to call a protected endpoint
```bash
TOKEN="eyJhbGci..."

curl http://localhost:8080/api/v1/appointments \
  -H "Authorization: Bearer $TOKEN"
```

### Test via web UI
1. Start web app: `cd eng/web-app && npm run dev`
2. Open `http://localhost:3000/signup`
3. Choose role → fill form → submit
4. Should redirect to the appropriate portal automatically

### Pre-seeded test accounts

There are no Flyway seed migrations. Use the register endpoint or the `/signup` page
to create accounts. Recommended test accounts:

| Role | Email | Password |
|---|---|---|
| Doctor | `doctor@dhanvanthri.local` | `Test@1234` |
| Pharmacist | `pharmacist@dhanvanthri.local` | `Test@1234` |
| Sponsor | `sponsor@dhanvanthri.local` | `Test@1234` |
| Patient | `patient@dhanvanthri.local` | `Test@1234` |

