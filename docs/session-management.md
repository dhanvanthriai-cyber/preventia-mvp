# Session Management — Preventia MVP

## Architecture: Stateless JWT + Persistent Refresh Tokens

There are **no server-side HTTP sessions**. Spring Security is configured with `SessionCreationPolicy.STATELESS`.

---

## Two-Token Flow

| Token | Type | TTL | Storage |
|---|---|---|---|
| **Access Token** | Signed JWT (HMAC-SHA) | Configurable (`JWT_EXPIRY_SECONDS`, default 24h) | Client-side only (memory / localStorage) |
| **Refresh Token** | Opaque UUID string | **30 days** | **PostgreSQL** `refresh_tokens` table |

---

## How It Works

### 1. Login / Register
**Endpoints:** `POST /api/v1/auth/login` · `POST /api/v1/auth/register`

- Spring's `AuthenticationManager` verifies email + BCrypt-hashed password
- A signed JWT is generated with the user's `role` embedded as a claim
- A 30-day refresh token UUID is created and saved to PostgreSQL (`refresh_tokens`)
- Both tokens are returned in the response (`JwtResponse`)

```json
{
  "accessToken": "<signed-jwt>",
  "tokenType": "Bearer",
  "expiresInSeconds": 86400,
  "role": "DOCTOR",
  "refreshToken": "<uuid>"
}
```

---

### 2. Authenticated Requests

- Client sends `Authorization: Bearer <accessToken>` on every request
- `JwtAuthFilter` (`OncePerRequestFilter`) intercepts every request:
  1. Extracts the `Bearer` token from the `Authorization` header
  2. Validates the JWT signature + expiry via `JwtTokenProvider`
  3. Populates the Spring `SecurityContext` with the principal + role
- **No DB or Redis lookup per request** — the JWT is self-contained (stateless)

---

### 3. Token Refresh (Rotation Pattern)
**Endpoint:** `POST /api/v1/auth/refresh`

```json
{ "refreshToken": "<uuid>" }
```

1. Server looks up the refresh token UUID in PostgreSQL
2. Checks `expiresAt` — expired tokens return **HTTP 401**
3. **Rotation**: old token row is deleted, a new one is inserted atomically
4. A fresh access JWT + new refresh token UUID are returned

> **Security:** Replayed or consumed tokens return HTTP 401, signalling a potential replay attack.

---

### 4. Logout / Revocation

All refresh tokens for a user are deleted from PostgreSQL via `deleteAllByUserId(userId)`.  
The access JWT remains valid until its natural expiry (no server-side revocation list).

---

## Key Classes

| Class | Location | Responsibility |
|---|---|---|
| `JwtTokenProvider` | `shared/security/JwtTokenProvider.java` | Generates + validates signed JWTs |
| `JwtAuthFilter` | `shared/security/JwtAuthFilter.java` | Per-request JWT extraction + SecurityContext population |
| `SecurityConfig` | `shared/config/SecurityConfig.java` | Stateless session policy, CORS, whitelist rules |
| `AuthService` | `auth/service/AuthService.java` | Login + register orchestration |
| `RefreshTokenService` | `auth/service/RefreshTokenService.java` | Refresh token create + rotate + revoke |
| `RefreshTokenRepository` | `auth/repository/RefreshTokenRepository.java` | PostgreSQL persistence for refresh tokens |
| `AuthController` | `auth/controller/AuthController.java` | REST endpoints: `/login`, `/register`, `/refresh` |

---

## What Redis Is Used For

Redis is provisioned in `docker-compose.yml` (labeled "Session cache + rate-limit counters") but is **not currently wired into the auth flow**. It is reserved for future rate limiting and caching features.

---

## Database Schema — `refresh_tokens`

Created by Flyway migration `V8__refresh_tokens.sql`:

```sql
CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY,
  user_id    BIGINT REFERENCES users(id),
  token      VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Seeding a Test User

There are **no seed users** in any Flyway migration. To create a test account, use the register endpoint:

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Doctor",
    "email": "doctor@preventia.local",
    "password": "Test@1234",
    "role": "DOCTOR"
  }'
```

- Returns **201 Created** with tokens on success
- Returns **409 Conflict** if the email is already registered

### Available Roles

| Role | Description |
|---|---|
| `DOCTOR` | Licensed physician |
| `PATIENT` | Patient / recipient |
| `SPONSOR` | NRI proxy sponsor |
| `PHARMACIST` | Dispensing pharmacy entity |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `JWT_SECRET` | HMAC-SHA signing key (inject from secrets manager) | *(required)* |
| `JWT_EXPIRY_SECONDS` | Access token lifetime in seconds | `86400` (24h) |
| `SPRING_DATA_REDIS_HOST` | Redis hostname | `redis` |
| `SPRING_DATA_REDIS_PORT` | Redis port | `6379` |

## How JWT_SECRET flows through the app
```
.env
 └── JWT_SECRET=preventia-local-dev-secret-2026
       │
       ▼
docker-compose.yml
 └── JWT_SECRET: ${JWT_SECRET}   ← passed as env var to the container
       │
       ▼
application.yml
 └── app.jwt.secret: ${JWT_SECRET}   ← Spring reads the env var
       │
       ▼
JwtTokenProvider.java
 └── @Value("${app.jwt.secret}") String secret
       └── Keys.hmacShaKeyFor(secret.getBytes())  ← becomes the HMAC signing key
```

## The auth flow end-to-end
```
POST /api/v1/auth/login
  │
  ├─ AuthService → AuthenticationManager.authenticate()
  │     └─ UserDetailsServiceImpl.loadUserByUsername(email)  ← hits PostgreSQL
  │           └─ BCrypt.verify(inputPassword, storedHash)
  │
  ├─ JwtTokenProvider.generateToken()
  │     └─ Signs JWT with JWT_SECRET (HMAC-SHA256)
  │           Claims: { sub: email, role: DOCTOR/PATIENT/SPONSOR, exp: +24h }
  │
  └─ Returns: { accessToken, expiresIn, role }

Every subsequent request (e.g. POST /api/v1/clinical/soap):
  │
  ├─ JwtAuthFilter intercepts
  │     └─ JwtTokenProvider.validateToken() → verifies signature with JWT_SECRET
  │           └─ Extracts role claim → sets SecurityContext
  │
  └─ @PreAuthorize("hasRole('DOCTOR')") on the controller method gates access
```