# Local Setup

This is the fastest supported path to get Preventia running on a local machine.

## 1. Required Tooling

Install these before touching the repo:

- Git
- Node.js `>=18`
- npm
- Java `21`
- Maven `3.9+`
- Podman Desktop with `podman compose`
- curl

Optional, depending on what you work on:

- Xcode for iOS mobile work
- Android Studio for Android mobile work
- AWS CLI v2 if you need AWS access from your machine

## 2. Repo Areas You Will Touch Most

| Path | Purpose |
| --- | --- |
| `eng/` | Spring Boot backend, Dockerfile, local compose stack |
| `eng/web-app/` | Next.js web app |
| `eng/mobile-app/` | Expo / React Native app |
| `eng/shared/` | Shared TypeScript package used by web + mobile |
| `docs/` | Product, auth, sprint, onboarding docs |
| `scripts/aws/` | Production bootstrap and deployment |

## 3. Clone and Install Dependencies

From the repo root:

```bash
git clone <repo-url>
cd preventia-mvp
```

Install and build the shared package first:

```bash
cd eng/shared
npm install
npm run build
```

Then install web and mobile dependencies:

```bash
cd ../web-app
npm install

cd ../mobile-app
npm install
```

## 4. Create Local Environment Files

Backend / local stack:

```bash
cd <repo-root>/eng
cp .env.example .env
```

Fill `.env` with placeholders you receive separately. At minimum, set:

```bash
POSTGRES_PASSWORD=<local-postgres-password>
JWT_SECRET=<32-plus-byte-secret>
JWT_EXPIRY_SECONDS=86400
DAILY_API_KEY=<real-daily-api-key-or-STUB>
DAILY_WEBHOOK_SECRET=<real-daily-webhook-secret-or-STUB>
DAILY_DYNAMIC_CA_IMPORT_ENABLED=true
DAILY_DYNAMIC_CA_IMPORT_HOST=api.daily.co
AWS_ACCESS_KEY_ID=STUB
AWS_SECRET_ACCESS_KEY=STUB
AWS_REGION=ap-south-1
S3_BUCKET_NAME=preventia-mvp-prescriptions
STREAM_API_KEY=<optional-or-stub>
STREAM_API_SECRET=<optional-or-stub>
STRIPE_API_KEY=STUB
RAZORPAY_API_KEY=STUB
RAZORPAY_API_SECRET=STUB
APP_ADMIN_BOOTSTRAP_SECRET=<local-bootstrap-secret>
LOG_LEVEL=INFO
```

If you use real Daily keys locally, keep `DAILY_DYNAMIC_CA_IMPORT_ENABLED=true`. On each container start, the app imports the live issuer chain currently presented for `api.daily.co` into a writable local JVM trust store. That makes local video-call testing work even on networks that intercept outbound TLS.

`DAILY_API_KEY=STUB` enables local Daily stub mode:
- appointment creation succeeds without calling `api.daily.co`
- fake room URLs/tokens are returned for local UI flows
- real video rooms are not created in local dev

Web app local env:

```bash
cd <repo-root>/eng/web-app
cp .env.local.example .env.local
```

Fill only the values you actually need for local web work. Typical placeholders:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
GOOGLE_CLIENT_ID=<optional>
APPLE_CLIENT_ID=<optional>
APPLE_REDIRECT_URI=http://localhost:3000
```

## 5. Start the Local Backend Stack

From `eng/`:

```bash
podman machine start
podman compose up --build -d
```

Check health:

```bash
curl http://localhost:8080/actuator/health
```

Expected result:

```json
{"status":"UP"}
```

Useful backend commands:

```bash
podman compose logs -f app
podman compose down
podman compose down -v
```

## 6. Start the Web App

From `eng/web-app/`:

```bash
npm run dev
```

Open:

- Landing / auth: `http://localhost:3000`
- Admin login: `http://localhost:3000/login?role=ADMIN`

## 7. Start the Mobile App

From `eng/mobile-app/`:

```bash
npm start
```

Useful variants:

```bash
npm run web
npm run ios
npm run android
```

## 8. Create a Local Admin

You have two supported paths.

### Option A — Direct local helper

```bash
cd <repo-root>
bash scripts/app/create-admin.sh
```

Default local admin:

- Email: `admin@preventia.local`
- Password: `Admin@1234`

### Option B — Bootstrap endpoint

If `APP_ADMIN_BOOTSTRAP_SECRET` is set in `eng/.env`, call:

```bash
curl -X POST http://localhost:8080/api/v1/auth/bootstrap-admin \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Bootstrap-Secret: <local-bootstrap-secret>' \
  -d '{
    "name": "Platform Admin",
    "email": "admin@preventia.local",
    "password": "Admin@1234"
  }'
```

## 9. Recommended Validation Before You Start Coding

Backend:

```bash
cd eng
mvn test
```

Shared package:

```bash
cd eng/shared
npm run build
npm run type-check
```

Web:

```bash
cd eng/web-app
npm run build
npm run type-check
```

Mobile:

```bash
cd eng/mobile-app
npm run type-check
npm test
```

## 10. Local Development Notes

- The backend still uses some legacy local defaults like the Postgres user `dhan_dev`. Do not rename those casually without updating scripts and compose.
- The shared package must be rebuilt when you change exported types or shared hooks:

```bash
cd eng/shared
npm run build
```

- The web app uses generated `.next/types`, so `npm run type-check` can fail if you run it before a build.
- If you only need backend + web, you can skip the mobile install entirely.

## 11. Common Local Failures

### App health check fails

```bash
podman compose logs -f app
```

Check:

- `JWT_SECRET` is at least 32 bytes
- `POSTGRES_PASSWORD` in `.env` matches the compose database
- Podman machine is running

### Web login looks broken but API is healthy

Rebuild the web app:

```bash
cd eng/web-app
npm run build
npm run dev
```

### Need a clean database reset

```bash
cd eng
podman compose down -v
podman compose up --build -d
```
