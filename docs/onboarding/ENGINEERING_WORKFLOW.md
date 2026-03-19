# Engineering Workflow

This document explains how to work on Preventia safely after your local environment is running.

## 1. Codebase Map

| Area | Path | Notes |
| --- | --- | --- |
| Backend | `eng/src/main/java/com/preventia/` | Spring Boot modular monolith |
| DB migrations | `eng/src/main/resources/db/migration/` | Flyway SQL migrations |
| Web app | `eng/web-app/` | Next.js 14 |
| Mobile app | `eng/mobile-app/` | Expo / React Native |
| Shared TS code | `eng/shared/` | Used by web and mobile via `file:../shared` |
| Infra scripts | `scripts/aws/` | AWS bootstrap, deploy, verify |
| Docs / specs | `docs/` | Product, auth, sprint, onboarding docs |
| Mockups | `mockups/` | Reference images and wireframes |

## 2. How to Pick Up a New Feature

Recommended reading order:

1. `docs/prd.md`
2. `docs/prd-progress.md`
3. relevant file in `docs/sprints/`
4. relevant mockup under `mockups/`
5. current implementation in `eng/web-app/`, `eng/mobile-app/`, or backend modules

## 3. Shared Package Rules

The web and mobile apps both depend on `@preventia/shared`.

Whenever you change shared exports, rebuild it before testing downstream apps:

```bash
cd eng/shared
npm run build
```

## 4. Validation Commands by Area

### Shared

```bash
cd eng/shared
npm run build
npm run type-check
```

### Web

```bash
cd eng/web-app
npm run build
npm run type-check
```

### Mobile

```bash
cd eng/mobile-app
npm run type-check
npm test
```

### Backend

```bash
cd eng
mvn test
```

If you are working through the local Podman stack instead of Maven directly:

```bash
cd eng
podman compose logs -f app
```

## 5. Git Conventions

This repo uses conventional-style commit messages. Match these patterns:

- `feat(scope): summary`
- `fix(scope): summary`
- `refactor(scope): summary`
- `chore(scope): summary`

Examples from history:

- `feat(chat-ui): Stream Chat web panel + mobile patient screen`
- `feat(auth-web): Next.js middleware + login page + auth cookie helpers`
- `chore(firebase): gitignore credentials, add stub JSON, document FIREBASE_CREDENTIALS_PATH in .env.example`

## 6. Suggested Change Flow

1. Pull latest `main`
2. Make the smallest coherent change set possible
3. Run validations only for the areas you changed
4. Update docs if you changed setup, auth, deployment, or product behavior
5. Commit with a scoped conventional message
6. If the change affects production behavior, include deploy notes

## 7. Common Engineering Pitfalls

### Web type-check fails with missing `.next/types`

Run:

```bash
cd eng/web-app
npm run build
npm run type-check
```

### Backend auth changes seem to work locally but not on AWS

Check whether the web app is proxying through a stale API deployment. Rebuild and redeploy the web service if needed.

### Shared types changed but web/mobile still look wrong

You probably forgot to rebuild `eng/shared`.

### AWS scripts reference secrets you do not have

Do not invent values. Use placeholders locally and ask the team for the real ones.

## 8. When to Update Docs

Update docs whenever you change:

- setup steps
- auth flows
- route protection or redirects
- AWS deployment steps
- architecture
- sprint / implementation status

At minimum, update the closest relevant doc in `docs/`.

## 9. Recommended First Contributions for a New Engineer

- Fix a small web flow and run the web validation sequence
- Add or update one onboarding / setup doc
- Make a low-risk backend change with a migration review
- Add an admin or portal UI refinement and verify locally
