# Preventia Engineering Onboarding

This folder is the starting point for a new engineer joining Preventia.

## Read This First

1. [LOCAL_SETUP.md](./LOCAL_SETUP.md)
2. [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)
3. [ENGINEERING_WORKFLOW.md](./ENGINEERING_WORKFLOW.md)

## Platform Snapshot

Preventia is currently a modular monolith with:

- Spring Boot backend in `eng/`
- Next.js web app in `eng/web-app/`
- Expo / React Native mobile app in `eng/mobile-app/`
- Shared TypeScript package in `eng/shared/`
- AWS deployment scripts in `scripts/aws/`
- Product and implementation docs in `docs/`

## Useful Reference Docs

- Product / planning:
  - [docs/prd.md](../prd.md)
  - [docs/prd-progress.md](../prd-progress.md)
  - [docs/sprints/README.md](../sprints/README.md)
- Auth / session behavior:
  - [docs/auth-signup-signin.md](../auth-signup-signin.md)
  - [docs/session-management.md](../session-management.md)
- AWS architecture:
  - [scripts/aws/REFERENCE_ARCHITECTURE.md](../../scripts/aws/REFERENCE_ARCHITECTURE.md)
  - [scripts/aws/REFERENCE_ARCHITECTURE_C4.md](../../scripts/aws/REFERENCE_ARCHITECTURE_C4.md)
  - [scripts/aws/assets/preventia-aws-reference-architecture.svg](../../scripts/aws/assets/preventia-aws-reference-architecture.svg)

## Important Notes

- The current authoritative deployment tooling lives under `scripts/aws/`.
- Older historical notes may still mention `ops/aws/`; use `scripts/aws/` going forward.
- Do not commit `.env`, `.env.aws`, local credential files, or machine-specific artifacts.
- The web app type-check flow depends on generated `.next/types`, so the reliable order is:

```bash
cd eng/web-app
npm run build
npm run type-check
```

## Recommended First-Day Checklist

- Clone the repo and verify local toolchain versions.
- Complete the local setup guide and get backend + web running.
- Create a local admin and sign in to `/login?role=ADMIN`.
- Read the engineering workflow guide before making your first change.
- Get AWS access from the team and verify `aws sts get-caller-identity --profile preventia`.
