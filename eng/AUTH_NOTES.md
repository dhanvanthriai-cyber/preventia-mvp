# Auth Layer — Public Endpoints

_Last updated: 2026-03-11 by @eng_

---

## Endpoints

Both endpoints are **public** (no `Authorization` header required). Configured in `SecurityConfig` via `requestMatchers("/api/v1/auth/**").permitAll()`.

---

### `POST /api/v1/auth/register`

Creates a new user account and immediately returns a JWT so the client is authenticated without a second round-trip.

**Request**
```json
{
  "name":     "Arjun Mehta",
  "email":    "arjun@example.com",
  "password": "S3cur3P@ssword!",
  "role":     "SPONSOR"
}
```

**Response — 201 Created**
```json
{
  "accessToken":      "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType":        "Bearer",
  "expiresInSeconds": 86400,
  "role":             "SPONSOR"
}
```

**Error — 409 Conflict** (email already in use)
```
Email already registered
```

**Error — 400 Bad Request** (validation failure — missing/invalid fields)
```json
{
  "errors": ["Email is required", "Role is required (SPONSOR, RECIPIENT, DOCTOR, PHARMACIST)"]
}
```

---

### `POST /api/v1/auth/login`

Authenticates existing credentials and returns a JWT.

**Request**
```json
{
  "email":    "arjun@example.com",
  "password": "S3cur3P@ssword!"
}
```

**Response — 200 OK**
```json
{
  "accessToken":      "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType":        "Bearer",
  "expiresInSeconds": 86400,
  "role":             "SPONSOR"
}
```

**Error — 401 Unauthorized** (wrong credentials — raised by Spring Security `AuthenticationManager`)

---

## Role Values

| Value         | Description                                          |
|---------------|------------------------------------------------------|
| `RECIPIENT`   | Indian parent / elder receiving care                 |
| `SPONSOR`     | NRI child acting as a remote proxy sponsor           |
| `DOCTOR`      | Licensed physician on the platform                   |
| `PHARMACIST`  | Dispensing pharmacy entity                           |

---

## Token Usage

Include the returned `accessToken` in the `Authorization` header for all protected endpoints:

```
Authorization: Bearer <accessToken>
```

The token embeds the user's `role` as a custom JWT claim. Spring Security extracts this via `JwtAuthFilter` → `JwtTokenProvider#getRole()`.

---

## Deferred to V2

- **Password reset** — forgot-password flow with time-limited reset tokens
- **Email verification** — confirm account via link sent to inbox
- **Refresh tokens** — short-lived access + long-lived refresh token pair
- **Rate limiting** — per-IP throttle on `/login` and `/register` to prevent brute force
