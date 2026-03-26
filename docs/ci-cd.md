# CI/CD — GitHub Actions

## How it works

Two workflow files live in `.github/workflows/`:

```
.github/workflows/
├── ci-cd.yml       ← full pipeline: type-check + tests + build + deploy
└── pr-checks.yml   ← fast PR feedback: type-check + compile only (no deploy)
```

### Flow diagram

```
Push to main                         Pull Request
──────────────                       ─────────────
[ci] shared build                    [frontend-checks] type-check web
[ci] web type-check                  [backend-checks]  mvn compile
[ci] mobile type-check (warn only)
[ci] mvn verify + unit tests
        │
        ├── [deploy-api]  Build Spring Boot Docker image
        │                 Push to ECR (preventia/api:sha + :latest)
        │                 Trigger App Runner redeploy → wait RUNNING
        │                          │
        └──────────────────────────┘
                                   [deploy-web]  Build Next.js Docker image
                                                 (bakes API URL into image)
                                                 Push to ECR (preventia/web)
                                                 Trigger App Runner → wait RUNNING
                                                 Post URLs to job summary
```

### Key design decisions

**Why API deploys before Web?**
The Next.js image bakes `NEXT_PUBLIC_API_BASE_URL` at build time (Next.js `next build`
inlines env vars prefixed `NEXT_PUBLIC_`). The API App Runner URL must be stable before
the web image is built. `deploy-web` has `needs: [ci, deploy-api]`.

**Why not a single job?**
API build (Maven + Docker) takes ~5 min. Web build (npm + Next.js + Docker) takes ~4 min.
Running them in parallel after CI passes cuts total deploy time from ~12 min to ~8 min.

**Layer caching**
Both Docker jobs use `docker/build-push-action` with `cache-from/cache-to: type=gha`.
GitHub Actions cache stores Docker layer blobs. On subsequent runs:
- Maven dependencies layer: cached if `pom.xml` unchanged (~2.5 min saved)
- npm install layers: cached if `package-lock.json` unchanged (~1.5 min saved)
- Next.js build cache: cached between runs

**Mobile app**
`eng/mobile-app/` is type-checked in CI but not deployed (Expo / EAS Build handles
the mobile release pipeline separately). Mobile type-check is `continue-on-error: true`
due to the pre-existing `@preventia/shared` module resolution issue that requires
`npm install` in mobile-app after the shared package builds.

---

## Required GitHub Secrets

Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

### Mandatory (deployment will fail without these)

| Secret | Value | Where to get it |
|--------|-------|-----------------|
| `AWS_ACCESS_KEY_ID` | Access key for `preventia-deploy` IAM user | `scripts/aws/00-setup-deploy-iam.sh` creates this |
| `AWS_SECRET_ACCESS_KEY` | Secret key for `preventia-deploy` IAM user | Same as above |
| `AWS_ACCOUNT_ID` | `246599827879` | Your AWS account |
| `AWS_REGION` | `ap-south-1` | Fixed (Mumbai) |

### Recommended (prevents hardcoded URL in workflow)

| Secret | Value | Notes |
|--------|-------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://<your-api-apprunner-url>` | Get from `aws apprunner list-services` after first deploy. If not set, the workflow queries App Runner live — but a secret is faster and more reliable. |

### Not needed as GitHub secrets
All runtime secrets (`JWT_SECRET`, `DAILY_API_KEY`, `STREAM_API_KEY`, `DB_PASSWORD`, etc.)
are read from **AWS Secrets Manager** at App Runner runtime via `scripts/aws/04-setup-secrets.sh`.
They don't need to exist as GitHub secrets — they never touch the CI pipeline.

---

## First-time setup

### 1. Run the infrastructure scripts once (if not already done)

```bash
cd scripts/aws
export AWS_PROFILE=preventia
./01-setup-ecr.sh        # creates preventia/api and preventia/web ECR repos
./02-setup-rds.sh        # RDS PostgreSQL (skip if already exists)
./03-setup-elasticache.sh
./04-setup-secrets.sh    # writes runtime secrets to Secrets Manager
./04a-setup-vpc-connector.sh
./05-setup-apprunner.sh  # creates both App Runner services
```

### 2. Add GitHub secrets

Add the 4 mandatory secrets above. The workflow will not attempt any deploy on PRs
so you can safely add them even before infrastructure is ready.

### 3. Push to main

The next push to `main` will trigger the full pipeline. Watch it at:
`https://github.com/<org>/preventia-mvp/actions`

### 4. Get the API URL for the secret

After the first successful deploy:
```bash
aws apprunner list-services --region ap-south-1 \
  --query "ServiceSummaryList[?ServiceName=='preventia-api'].ServiceUrl" \
  --output text
```
Add `https://<that-url>` as the `NEXT_PUBLIC_API_BASE_URL` secret so future web builds
don't need to query App Runner.

---

## Triggering a manual deploy

From GitHub UI: **Actions → CI / CD → Run workflow → main**

Or from terminal (requires `gh` CLI):
```bash
gh workflow run ci-cd.yml --ref main
```

To deploy only one service locally (uses the original script):
```bash
cd scripts/aws
./deploy.sh api   # Spring Boot only
./deploy.sh web   # Next.js only
./deploy.sh both  # both (same as CI)
```

---

## Troubleshooting

### "Service not found — skipping redeploy"
The App Runner services haven't been created yet. Run `./05-setup-apprunner.sh` first.

### Web type-check fails on CI but passes locally
Run `cd eng/shared && npm run build` first. CI does this automatically; local dev
sometimes forgets to rebuild shared after pulling changes.

### Maven build fails with missing `JWT_SECRET`
The CI job sets `JWT_SECRET=ci-test-secret-at-least-32-chars-long` for test runs.
If you add a new `@Value("${SOME_VAR}")` without a default, tests will fail.
Always add `:STUB` or `:false` defaults to non-critical env vars in `application.yml`.

### ECR push denied
The `preventia-deploy` IAM user needs `ecr:GetAuthorizationToken`,
`ecr:BatchCheckLayerAvailability`, `ecr:PutImage`, etc.
Check `scripts/aws/iam/preventia-deploy-bootstrap-policy.json`.

### App Runner deploy stuck on OPERATION_IN_PROGRESS
App Runner only allows one deployment at a time. Wait for the current operation
to finish or cancel it in the AWS console before re-triggering.
