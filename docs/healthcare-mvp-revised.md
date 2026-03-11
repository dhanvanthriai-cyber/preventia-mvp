# Healthcare MVP — Revised Technical Plan
## 3-Sided Marketplace: Patient + Doctor + Pharmacy (Lightweight Admin)

---

## Reality Check: MVP ≠ All Features Lite

You selected every feature as must-have. Here's the honest trade-off: in 4–5 months with 2–3 people, you can build **all these features** — but each one must be scoped to its **minimum viable version**. The table below shows what "MVP version" means for each feature versus the full version you'll build later.

| Feature | MVP Version (Months 1–5) | Full Version (Post-Launch) |
|---------|--------------------------|---------------------------|
| **Video Consultations** | Daily.co pre-built UI, one-click join, basic recording | Custom UI, screen share, virtual waiting room, breakout rooms |
| **Appointment Booking** | Calendar view, time slot selection, email/SMS reminders | Recurring appointments, waitlists, multi-provider booking, calendar sync |
| **In-App Chat** | 1:1 text chat (patient↔doctor, patient↔pharmacy) using Stream Chat SDK | Group chat, file sharing, read receipts, chatbot triage |
| **Prescription & Meds** | Doctor uploads Rx PDF → pharmacy receives → manual verification → patient notified | Full e-prescribing via DoseSpot/Surescripts, auto-verification, refill subscriptions |
| **Loved-One Proxy** | Delegated access toggle on patient profile — loved one sees same data | Granular permissions, multiple proxies, consent audit trail |
| **EHR** | Structured clinical notes stored in-app (FHIR-ready schema) | Full FHIR R4 read/write integration with external EMRs |
| **Pharmacy Catalog** | Manual catalog upload (CSV), basic search, fixed pricing | Real-time stock sync, dynamic pricing, promotions, expiry tracking |
| **Payments** | Stripe Checkout — flat fee per consultation + pharmacy order payment | Stripe Connect multi-party splits, insurance, commission rules |
| **Admin Panel** | User management, appointment overview, basic reporting | Disputes, compliance flags, audit logs, pharmacy onboarding workflow |

**Key MVP shortcut: Skip DoseSpot/Surescripts integration entirely for MVP.** Instead, doctors upload prescription PDFs which pharmacies verify manually. This alone saves 2–4 months of vendor onboarding and $5K–15K in licensing. You add e-prescribing in v2.

---

## Revised Tech Stack (Simplified for Speed)

| Layer | Technology | Why This for MVP |
|-------|-----------|-----------------|
| **Backend** | Java 21 + Spring Boot 3.2 | Your strength; single modular monolith |
| **Frontend — Mobile** | React Native (Expo) | Single codebase, 3 role-based views |
| **Frontend — Web** | Next.js 14 | Doctor dashboard + Pharmacy panel + Admin panel |
| **Database** | PostgreSQL 16 (AWS RDS) | Single DB, schema-separated by domain |
| **Cache** | Redis (ElastiCache) | Sessions, appointment slot locking |
| **Video** | Daily.co (pre-built UI) | HIPAA BAA, 5 lines of code to embed, cheapest option |
| **Chat** | Stream Chat SDK | HIPAA-compliant, pre-built UI components, 1-week integration |
| **Notifications** | AWS SES + Twilio SMS | Appointment reminders + order updates |
| **Payments** | Stripe Checkout (not Connect) | Simplest integration; upgrade to Connect in v2 |
| **File Storage** | S3 (encrypted) | Prescription PDFs, clinical notes |
| **Search** | PostgreSQL full-text search | Good enough for MVP medication/doctor search — skip OpenSearch |
| **Deployment** | AWS ECS Fargate + Terraform | Single service, auto-scaling |
| **CI/CD** | GitHub Actions | Automated deploy on merge to main |

### What We Dropped vs. Full Plan

| Removed for MVP | Savings | Add Back In |
|-----------------|---------|-------------|
| OpenSearch cluster | $300/mo + 2 weeks dev | v2 when catalog exceeds 10K items |
| DoseSpot e-prescribing | $200–500/mo + 3 months onboarding | v2 (start onboarding in Month 3) |
| Stripe Connect (multi-party) | 2 weeks dev complexity | v2 when pharmacy payouts need automation |
| Kong API Gateway | $0 saved but 1 week dev | v2 when you need rate limiting per partner |
| Custom video UI | 2 weeks dev | v2 based on user feedback |

---

## Revised Domain Model (3 Sides)

```
┌──────────────────────────────────────────────────┐
│              SPRING BOOT MONOLITH                 │
│                                                   │
│  ┌──────────┐ ┌───────────┐ ┌─────────────────┐ │
│  │ Auth &   │ │ Appoint-  │ │ Clinical Notes  │ │
│  │ Users    │ │ ments     │ │ & Prescriptions │ │
│  ├──────────┤ ├───────────┤ ├─────────────────┤ │
│  │ Video    │ │ Chat      │ │ Pharmacy &      │ │
│  │ Sessions │ │ Module    │ │ Orders          │ │
│  ├──────────┤ ├───────────┤ ├─────────────────┤ │
│  │ Payments │ │ Notifi-   │ │ Admin           │ │
│  │          │ │ cations   │ │ (lightweight)   │ │
│  └──────────┘ └───────────┘ └─────────────────┘ │
└──────────────────┬───────────────────────────────┘
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
  PostgreSQL    Redis       S3 (PHI)
```

### Core Entities (MVP)

- **User** → Role: Patient | Doctor | Pharmacist | Admin
- **Patient** → has optional ProxyAccess (loved one link)
- **Patient** → books Appointment → with Doctor
- **Appointment** → spawns VideoSession (Daily.co room) + ChatThread
- **Doctor** → creates ClinicalNote → optionally attaches PrescriptionPDF
- **PrescriptionPDF** → sent to PharmacyOrder → at Pharmacy
- **Pharmacy** → has MedicationCatalog (CSV-imported)
- **PharmacyOrder** → has PaymentRecord (Stripe)
- **Admin** → manages Users, views Appointments, sees Reports

---

## Revised Build Plan — 18 Weeks (4.5 Months)

### Sprint 0: Foundation (Weeks 1–2)

| Task | Details | Owner |
|------|---------|-------|
| Project scaffolding | Spring Boot monolith, Next.js app, React Native (Expo) shell | Satish |
| Database schema v1 | Users, roles, appointments, prescriptions, orders, pharmacy catalog | Satish |
| Auth system | Spring Security + JWT, social login (Google/Apple), role-based access | Dev 1 |
| CI/CD pipeline | GitHub Actions → ECS Fargate, Terraform for RDS + Redis + S3 | Satish + AI agents |
| HIPAA baseline | Encryption config, audit log table, S3 KMS, CloudTrail | Satish |

### Sprint 1: Patient + Doctor Core (Weeks 3–6)

| Task | Details | Owner |
|------|---------|-------|
| Patient registration & profile | Sign up, profile, consent capture, loved-one proxy toggle | Dev 1 |
| Doctor registration & profile | Credentials, availability schedule, specialty tags | Dev 1 |
| Appointment booking | Calendar UI, time slot selection, conflict detection | Dev 1 + AI agents |
| Appointment reminders | SES email + Twilio SMS, 24h and 1h before | AI agents (boilerplate) |
| Video consultation | Daily.co embed in mobile + web, room creation API, recording toggle | Satish |
| Clinical notes | Structured note form (SOAP format), save to DB, FHIR-ready schema | Satish |
| Prescription upload | Doctor uploads PDF → S3 → linked to patient + appointment | Dev 1 |
| Patient mobile app | Home screen, booking flow, upcoming appointments, join video button | Dev 1 |
| Doctor web dashboard | Today's appointments, patient queue, note-taking, Rx upload | Satish |

### Sprint 2: Chat + Pharmacy Side (Weeks 7–11)

| Task | Details | Owner |
|------|---------|-------|
| In-app chat | Stream Chat SDK integration, patient↔doctor and patient↔pharmacy threads | Dev 1 |
| Pharmacy registration | Sign up, license info, service area, basic profile | Dev 2 (onboard now) |
| Medication catalog | CSV upload, basic search (Postgres full-text), price display | Dev 2 + AI agents |
| Prescription flow | Doctor Rx PDF → notification to patient → patient selects pharmacy → pharmacy receives | Satish |
| Pharmacy verification queue | Pharmacist views incoming Rx, accepts/rejects, marks as prepared | Dev 2 |
| Order management | Patient checkout (delivery/pickup), order status tracking | Dev 2 |
| Payments | Stripe Checkout for consultations + pharmacy orders, payment history | Dev 1 |
| Pharmacy web dashboard | Incoming orders, Rx queue, catalog management, order status updates | Dev 2 |

### Sprint 3: Proxy Access + Admin + Polish (Weeks 12–15)

| Task | Details | Owner |
|------|---------|-------|
| Loved-one proxy access | Link loved one to patient account, delegated view of appointments + Rx + orders | Dev 1 |
| Admin panel | User management (CRUD all roles), appointment overview, basic analytics (counts + revenue) | Dev 2 + AI agents |
| Notification center | In-app notification feed, push notifications (Expo Push) | Dev 1 |
| Doctor search | Search by specialty, name, availability — Postgres full-text | AI agents |
| Prescription history | Patient view of all past Rx with download links | AI agents |
| Order status tracking | Status updates (received → verified → prepared → ready), SMS/email notifications | Dev 2 |
| Mobile polish | Navigation cleanup, loading states, error handling, offline graceful degradation | Dev 1 |
| Web polish | Responsive design, form validation, accessibility basics | Dev 2 |

### Sprint 4: Testing + Security + Launch (Weeks 16–18)

| Task | Details | Owner |
|------|---------|-------|
| Integration testing | End-to-end flows: booking → video → Rx → pharmacy → order → payment | All |
| Security review | OWASP top 10 scan, PHI access audit, penetration test (lightweight) | Satish + external |
| HIPAA checklist | Encryption verification, access logs, BAA confirmations (AWS, Daily.co, Stream, Stripe) | Satish |
| Performance testing | Load test key endpoints (booking, video, search) | AI agents |
| Bug fixes + stabilization | Buffer for critical bugs found in testing | All |
| App Store submission | iOS App Store + Google Play, review process (allow 1–2 weeks) | Satish |
| Documentation | API docs (auto-generated), deployment runbook, onboarding guide | AI agents |

---

## AI Agent Utilization Map

| Week Block | AI Agent Tasks (30–40% of code output) |
|-----------|----------------------------------------|
| Weeks 1–2 | Terraform modules, Spring Boot scaffolding, DB migration scripts, GitHub Actions workflows |
| Weeks 3–6 | CRUD APIs for all entities, React Native screen templates, form components, appointment booking logic |
| Weeks 7–11 | Pharmacy dashboard components, order state machine, notification templates, search queries |
| Weeks 12–15 | Admin panel (data tables, charts), test generation, API documentation |
| Weeks 16–18 | Test scripts, security scanning config, deployment scripts |

**Estimated AI agent contribution: ~35% of total code, saving approximately 6–8 developer-weeks.**

---

## Revised Infrastructure Costs (Monthly)

### Development + Staging

| Service | Spec | Cost/Mo |
|---------|------|---------|
| ECS Fargate | 1 task, 0.5 vCPU / 1GB | $15 |
| RDS PostgreSQL | db.t3.micro, single-AZ | $15 |
| ElastiCache Redis | cache.t3.micro | $12 |
| S3 + KMS | Minimal | $5 |
| CloudWatch | Basic | $10 |
| **Dev Total** | | **$57/mo** |

### Production (Launch — up to 500 users)

| Service | Spec | Cost/Mo |
|---------|------|---------|
| ECS Fargate | 2 tasks, 0.5 vCPU / 1GB, auto-scale to 4 | $60 |
| RDS PostgreSQL | db.t3.medium, multi-AZ | $140 |
| ElastiCache Redis | cache.t3.small | $25 |
| S3 + KMS | 50GB encrypted | $15 |
| ALB | Load balancer | $25 |
| CloudWatch + CloudTrail | Logging + audit | $50 |
| SES | ~5K emails/mo | $5 |
| WAF | Basic rules | $20 |
| **AWS Total** | | **$340/mo** |

### Third-Party Services (Production)

| Service | Model | Cost/Mo |
|---------|-------|---------|
| Daily.co | Free tier covers 2K min/mo; then $0.04/min | $0–150 |
| Stream Chat | Maker plan (free to 100 MAU); Scale at $399/mo | $0–399 |
| Twilio SMS | ~2K msgs/mo | $20 |
| Stripe | 2.9% + $0.30 per txn (no monthly fee) | $0 |
| **Third-Party Total** | | **$20–570/mo** |

### Total Monthly at Launch

| Scenario | Monthly | Annual |
|----------|---------|--------|
| **Lean launch (free tiers)** | ~$420 | ~$5,040 |
| **Scaled (500 active users)** | ~$910 | ~$10,920 |

---

## Revised Total Cost (Full MVP Build)

| Category | Low | High |
|----------|-----|------|
| Offshore Dev 1 (5 months, senior) | $15,000 | $25,000 |
| Offshore Dev 2 (3 months, mid-level, starts Week 7) | $4,500 | $9,000 |
| AI coding tools (5 months) | $500 | $500 |
| AWS infra (5 months dev + 2 months prod) | $965 | $1,500 |
| Third-party services (2 months prod) | $40 | $1,140 |
| HIPAA (lightweight pen test + legal review) | $3,000 | $7,000 |
| App Store fees | $125 | $125 |
| Contingency (15%) | $3,620 | $6,640 |
| **Grand Total** | **~$28K** | **~$51K** |

**Realistic midpoint: ~$35K–$40K for MVP launch.**

---

## Comparison: Original vs. Revised

| Metric | Original (Full Build) | Revised (3-Side MVP) |
|--------|----------------------|---------------------|
| User personas | 9 | 3 + lightweight admin |
| Timeline | 16–20 months | 4.5 months |
| Team cost | $68K–150K | $20K–34K |
| Infra + services (build period) | $42K–90K | $1K–3K |
| Total cost | $141K–305K | $28K–51K |
| Post-launch monthly | $2,000–4,500 | $420–910 |
| Biggest risk | Scope, regulation | Feature depth, pharmacy supply |

**You're saving 70–85% in cost and 75% in time by going MVP.**

---

## Post-MVP Roadmap (What to Add After Launch)

| Priority | Feature | When | Why |
|----------|---------|------|-----|
| **P0** | DoseSpot e-prescribing | Months 6–8 (start onboarding at Month 3) | Replaces manual PDF Rx flow |
| **P1** | Stripe Connect payouts | Month 6 | Automate pharmacy payment splits |
| **P1** | Health Coach + Nutritionist | Months 7–9 | Expand provider types using same booking/video infra |
| **P2** | Phlebotomist + delivery tracking | Months 9–11 | Last-mile logistics layer |
| **P2** | OpenSearch for catalog | Month 8 | When pharmacy catalog exceeds 10K items |
| **P3** | Full admin: disputes, compliance, audit | Months 10–12 | When transaction volume warrants it |
| **P3** | Insurance integration | Months 12+ | Complex payer-by-payer integration |
| **P4** | AI triage, IoT monitoring | Months 14+ | Differentiators once core is stable |

---

## Week 1 Action Items

1. **Scaffold the monolith** — Spring Boot project with module packages: `auth`, `appointment`, `clinical`, `pharmacy`, `order`, `notification`, `admin`
2. **Set up Terraform** — RDS, Redis, S3, ECS cluster, VPC with private subnets
3. **Design the DB schema** — Start with User, Role, Appointment, ClinicalNote, Prescription, Pharmacy, MedicationItem, Order, Payment tables
4. **Sign BAAs** — AWS (free), Daily.co (on their HIPAA plan), Stream Chat (enterprise inquiry), Stripe (request via dashboard)
5. **Post offshore dev job** — Look for a senior React Native + Spring Boot developer; they start Week 1 with you
6. **Set up GitHub repo** — Monorepo: `/backend` (Spring Boot), `/mobile` (React Native), `/web` (Next.js), `/infra` (Terraform)

