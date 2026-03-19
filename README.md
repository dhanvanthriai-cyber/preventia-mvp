# Preventia MVP

Preventia is a healthcare platform that brings patients, doctors, pharmacists, and admins into one operational system for appointments, consultations, prescriptions, payments, chat, and care coordination.

## What Is In This Repo

- `eng/`
  Spring Boot backend, local compose stack, Dockerfiles, database migrations
- `eng/web-app/`
  Next.js web application for patient, doctor, pharmacist, sponsor, and admin portals
- `eng/mobile-app/`
  Expo / React Native mobile application
- `eng/shared/`
  Shared TypeScript package used by web and mobile
- `scripts/aws/`
  AWS bootstrap, deployment, verification, and debugging scripts
- `docs/`
  Product, engineering, onboarding, sprint, and deployment documentation
- `mockups/`
  Visual references and wireframes

## Current Platform Shape

Core product areas:

- Patient portal
- Doctor portal
- Pharmacist portal
- Admin portal
- Video consultations
- Appointment booking
- Prescription and refill workflows
- Payments
- Chat and messaging

Current production infrastructure:

- App Runner for `preventia-web`
- App Runner for `preventia-api`
- RDS PostgreSQL for primary data
- ElastiCache Redis
- S3 for file storage
- ECR for images
- Secrets Manager for runtime secrets

## Start Here

If you are new to the project, begin with:

1. [docs/README.md](./docs/README.md)
2. [docs/onboarding/README.md](./docs/onboarding/README.md)
3. [docs/onboarding/LOCAL_SETUP.md](./docs/onboarding/LOCAL_SETUP.md)
4. [docs/onboarding/PRODUCTION_DEPLOYMENT.md](./docs/onboarding/PRODUCTION_DEPLOYMENT.md)

## Quick Local Setup

Prerequisites:

- Node.js `>=18`
- npm
- Java `21`
- Maven
- Podman Desktop with `podman compose`

Install dependencies:

```bash
cd eng/shared
npm install
npm run build

cd ../web-app
npm install

cd ../mobile-app
npm install
```

Create local env files:

```bash
cd <repo-root>/eng
cp .env.example .env

cd ../web-app
cp .env.local.example .env.local
```

Start backend stack:

```bash
cd <repo-root>/eng
podman machine start
podman compose up --build -d
```

Start web app:

```bash
cd <repo-root>/eng/web-app
npm run dev
```

Detailed guide:

- [docs/onboarding/LOCAL_SETUP.md](./docs/onboarding/LOCAL_SETUP.md)

## Quick Production Deployment

The supported production deployment flow uses the checked-in AWS scripts:

```bash
cd <repo-root>/scripts/aws
export AWS_PROFILE=preventia
./deploy.sh both
./verify.sh
```

For full bootstrap and env setup, use:

- [scripts/aws/README.md](./scripts/aws/README.md)
- [docs/onboarding/PRODUCTION_DEPLOYMENT.md](./docs/onboarding/PRODUCTION_DEPLOYMENT.md)

## Recommended Validation Commands

Shared package:

```bash
cd eng/shared
npm run build
npm run type-check
```

Web app:

```bash
cd eng/web-app
npm run build
npm run type-check
```

Mobile app:

```bash
cd eng/mobile-app
npm run type-check
npm test
```

Backend:

```bash
cd eng
mvn test
```

## Documentation Map

- Main docs portal:
  - [docs/README.md](./docs/README.md)
- Onboarding:
  - [docs/onboarding/README.md](./docs/onboarding/README.md)
- Product:
  - [docs/prd.md](./docs/prd.md)
  - [docs/prd-progress.md](./docs/prd-progress.md)
- Sprints:
  - [docs/sprints/README.md](./docs/sprints/README.md)
- Auth:
  - [docs/auth-signup-signin.md](./docs/auth-signup-signin.md)
  - [docs/session-management.md](./docs/session-management.md)
- AWS architecture:
  - [scripts/aws/REFERENCE_ARCHITECTURE.md](./scripts/aws/REFERENCE_ARCHITECTURE.md)
  - [scripts/aws/REFERENCE_ARCHITECTURE_C4.md](./scripts/aws/REFERENCE_ARCHITECTURE_C4.md)

## Important Notes

- Do not commit `.env`, `.env.local`, `.env.aws`, or credential files.
- The web app type-check flow depends on generated `.next/types`, so use:

```bash
cd eng/web-app
npm run build
npm run type-check
```

- If you change shared types or shared hooks, rebuild `eng/shared` before validating web or mobile.
- Use conventional commit messages:
  - `feat(scope): summary`
  - `fix(scope): summary`
  - `refactor(scope): summary`
  - `chore(scope): summary`
