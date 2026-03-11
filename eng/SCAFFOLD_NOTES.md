# SCAFFOLD_NOTES.md — @eng Session: eng-scaffold
**Project Dhanvanthri MVP · Spring Boot 3.2 / Java 21 / PostgreSQL 16**
_Last updated: 2026-03-11 (eng-scaffold subagent)_

---

## 1. What Was Built

```
eng/healthcare-mvp/
├── pom.xml                                  # Spring Boot 3.2.5, JJWT 0.12.5, HAPI FHIR 7.0.2
├── db/
│   └── V1__family_mapping.sql               # Flyway migration: users + family_relationships
└── src/main/
    ├── java/com/dhanvanthri/
    │   ├── DhanvanthriApplication.java
    │   ├── family/                           # Core session goal
    │   │   ├── controller/FamilyController.java
    │   │   ├── service/FamilyService.java
    │   │   ├── repository/FamilyRelationshipRepository.java
    │   │   ├── domain/User.java
    │   │   ├── domain/FamilyRelationship.java
    │   │   └── dto/{FamilyLinkRequest, FamilyLinkResponse}.java
    │   ├── auth/
    │   │   ├── controller/AuthController.java
    │   │   ├── service/AuthService.java
    │   │   ├── repository/UserRepository.java
    │   │   └── dto/{LoginRequest, JwtResponse}.java
    │   ├── clinical/
    │   │   ├── controller/ClinicalController.java
    │   │   ├── service/ClinicalService.java
    │   │   ├── repository/SoapNoteRepository.java
    │   │   ├── domain/SoapNote.java
    │   │   └── dto/SoapNoteRequest.java
    │   ├── pharmacy/
    │   │   ├── controller/PharmacyController.java
    │   │   ├── service/InventoryService.java
    │   │   ├── repository/MedicationRepository.java
    │   │   ├── domain/{Medication, InventoryAuditLog}.java
    │   │   └── dto/InventoryUpdateRequest.java
    │   └── shared/
    │       ├── config/{SecurityConfig, FhirConfig}.java
    │       ├── security/{JwtTokenProvider, JwtAuthFilter}.java
    │       └── fhir/FhirMapper.java
    └── resources/
        ├── application.yml
        └── db/migration/.gitkeep            # Flyway classpath location
```

---

## 2. Folder Structure Rationale

### Why `family/`, `auth/`, `clinical/`, `pharmacy/`, `shared/`?

Each package is a **bounded context** in the DDD sense. They are co-located in one JVM (monolith) but communicate only through service interfaces — not direct cross-package repository calls. The one deliberate exception: `auth.repository.UserRepository` is referenced by `family.service.FamilyService` because `User` is the foundational aggregate shared across all contexts. In V2 this seam becomes an explicit internal API.

`shared/` is not a dumping ground — it contains only infrastructure concerns (JWT, FHIR serialization, Spring Security config) that have zero business logic.

---

## 3. Key Design Decisions

### Modular Monolith over Microservices at MVP
**Reason:** 4.5-month launch timeline + 2-person engineering capacity.
- No service mesh, no distributed tracing, no inter-service auth overhead.
- Single DB transaction covers the entire Tri-Party consent flow (initiateLink → grantConsent) without 2PC.
- Oracle VM (single instance) is cost-optimal for sub-500 concurrent users at launch.
- Module boundaries are explicit enough to extract to microservices in V2 if traffic warrants.

### Flyway for Migrations (not Hibernate `ddl-auto: create`)
- `ddl-auto: validate` — Hibernate verifies schema matches entities but never mutates it.
- All schema changes go through numbered Flyway migrations (`V1__`, `V2__`, ...).
- This is non-negotiable for a platform storing PHI — rollback paths must be auditable.
- The `db/V1__family_mapping.sql` file lives at project root for review visibility; it is **also** copied to `src/main/resources/db/migration/` for Flyway's classpath scanner.

### JWT via JJWT 0.12 (not Spring OAuth2 Resource Server)
- JJWT 0.12 gives us full control over claim structure (embedding `role` directly).
- Spring OAuth2 Resource Server adds JWKS endpoint complexity we don't need at MVP.
- The JWT `role` claim maps 1:1 to `@PreAuthorize("hasRole('...')")` annotations.
- Signing key must be rotated via AWS Secrets Manager (ap-south-1) before production.

### HAPI FHIR R4 — Deferred to Serialization Layer Only
- FHIR Composition is generated on-demand by `FhirMapper` when EMR data is exported.
- Internal domain objects (`SoapNote`) use a plain relational schema for write performance.
- This avoids the overhead of a full HAPI FHIR JPA server at MVP while maintaining ABDM compliance at the output boundary.

### Inventory Safety Rail — `DrasticChangeException` Pattern
- Reducing stock by >50% in a single update throws `DrasticChangeException` (HTTP 409).
- The client retries with `?force=true` only after explicit user confirmation.
- This is stateless — no saga, no outbox. Sufficient for MVP concurrency levels.

### PHI Data Residency
- `application.yml` externalizes all secrets via env vars (DB_HOST, JWT_SECRET).
- AWS region is ap-south-1 (Mumbai) — enforced at infrastructure level, not application level.
- No PHI is logged (Spring Security logging is set to WARN; SQL logging is off in prod).

---

## 4. Next Steps for @eng

### Immediate (Sprint 1)
1. **Add Lombok** — annotate all domain/DTO classes with `@Data`, `@Builder`, `@NoArgsConstructor`. Eliminates ~200 lines of boilerplate getters/setters currently stubbed.
2. **Wire UserDetailsService** — implement `loadUserByUsername(email)` so Spring Security's `AuthenticationManager` can authenticate against the `users` table with BCrypt.
3. **Copy V1 SQL to Flyway classpath** — `cp db/V1__family_mapping.sql src/main/resources/db/migration/` and verify `./mvnw flyway:info` reports it as pending.
4. **Add V2 migration** — `V2__clinical_and_pharmacy.sql` for `soap_notes`, `medications`, and `inventory_audit_log` tables.

### Sprint 2
5. **Spring Security JWT — full integration test** — `@SpringBootTest` with `MockMvc`, asserting that a PATIENT JWT cannot call `/api/v1/family/link` (SPONSOR-only endpoint).
6. **HAPI FHIR dependency verification** — `FhirContext.forR4()` is slow to initialize (2–3s). Confirm singleton Bean is created at startup, not per-request.
7. **InventoryAuditLogRepository** — create and wire into `InventoryService`. Every `updateInventory` call must write an immutable audit row before returning.
8. **ClinicalService — sessionToken validation** — integrate Daily.co webhook or REST call to verify the session is active before allowing SOAP note writes.

### Sprint 3
9. **Razorpay integration stub** — `pharmacy/payment/` sub-package for sponsor-funded refill orders (USD→INR conversion, Razorpay order creation).
10. **S3 Prescription PDF upload** — pre-signed URL generation in `clinical/` for the Prescription PDF shortcut (PRD §3).
11. **OpenAPI / Swagger UI** — add `springdoc-openapi-starter-webmvc-ui` for Doctor/Pharmacy Portal API documentation.

---

## 5. Open Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| HAPI FHIR classpath size (~80MB) | Docker image bloat | Use multi-stage Dockerfile; consider `hapi-fhir-client` only if full structures not needed |
| Single-instance PostgreSQL | Data loss on crash | Enable RDS Multi-AZ or pg_auto_failover before beta |
| JWT secret in env var | Exposed in process list | Migrate to AWS Secrets Manager SDK fetch at startup |
| Daily.co sessionToken validation missing | EMR writes outside consultation window | Implement before any Doctor Portal goes live |

---
_This file is the authoritative scaffold record for the eng-scaffold session. Update as modules evolve._

---

## 6. Session Update — eng-docker-setup (2026-03-11)

### Local Dev Environment: docker-compose.yml ✅

`docker-compose.yml` is now the **canonical local development environment** for Project Dhanvanthri.

**Location:** `eng/healthcare-mvp/docker-compose.yml`

Services defined:
| Service | Image | Port | Notes |
|---------|-------|------|-------|
| `postgres` | `postgres:16-alpine` | 5432 | Named volume `postgres_data`; healthcheck via `pg_isready` |
| `redis` | `redis:7-alpine` | 6379 | Named volume `redis_data`; healthcheck via `redis-cli ping` |
| `app` | built from `./Dockerfile` | 8080 | Waits for `service_healthy` on both postgres and redis |

**To start the stack:**
```bash
cd eng/healthcare-mvp/
cp .env.example .env   # fill in DB credentials and JWT_SECRET
docker compose up -d
docker compose logs -f app
```

**Note on Docker group membership:** The `ubuntu` user was added to the `docker` group (`sudo usermod -aG docker ubuntu`). A logout/login (or `newgrp docker`) is required for passwordless access in new shells. Verified via `sg docker -c 'docker info'`.

### V2 Flyway Migration — ABDM + NRI Proxy Fields ✅

**Location:** `eng/healthcare-mvp/db/V2__add_user_abha_nri_fields.sql`

Adds to `users` table:
- `nri_proxy_id UUID` — links SPONSOR-role users to their NRI proxy identity (Tri-Party consent flow). Partial index on non-NULL rows.
- `abha_id VARCHAR(50)` — Ayushman Bharat Health Account ID for ABDM FHIR R4 patient linking (`Patient/$match`). Partial index on non-NULL rows.

`User.java` entity updated in-place with matching JPA fields (`@Column(name = "nri_proxy_id")` / `@Column(name = "abha_id", length = 50)`) and getters/setters. `java.util.UUID` import added.

---

## 7. Revised Next Steps — Updated Priority Order

### 🔴 Highest Priority (do these first)

1. **Write a minimal Dockerfile for the Spring Boot app**
   - `docker-compose.yml` currently references `./Dockerfile` — the stack cannot start without it.
   - Use a multi-stage build: `maven:3.9-eclipse-temurin-21` for the build stage; `eclipse-temurin:21-jre-alpine` for the runtime stage.
   - This unblocks all local integration testing against real Postgres + Redis.
   - See Open Risk: HAPI FHIR classpath size (~80MB) — multi-stage build is the mitigation.

2. **Wire UserDetailsService**
   - Implement `loadUserByUsername(email)` in `auth/service/` (or a new `UserDetailsServiceImpl`).
   - Load `User` from `UserRepository`, map `role` to a `GrantedAuthority`.
   - Register the bean in `SecurityConfig` so `AuthenticationManager` can authenticate against BCrypt-hashed passwords.
   - This is required before any `/auth/login` endpoint is testable end-to-end.

### 🟡 Still in Sprint 1 (unchanged)
3. Add Lombok to domain/DTO classes.
4. Copy V1 + V2 SQL to `src/main/resources/db/migration/` for Flyway classpath scanner.
5. Add V3 migration for `soap_notes`, `medications`, `inventory_audit_log` tables (was "V2" in prior notes, now V3).

