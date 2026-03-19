# Production Deployment

This guide covers the current Preventia production deployment flow on AWS.

## 1. Current Production Topology

Live stack:

- `preventia-web` on App Runner
- `preventia-api` on App Runner
- `preventia-postgres` on RDS PostgreSQL
- `preventia-redis` on ElastiCache Redis
- `preventia-mvp-prescriptions` on S3
- `preventia-vpc-connector` for App Runner private connectivity
- ECR repos:
  - `preventia/api`
  - `preventia/web`
- Secrets stored in Secrets Manager under `preventia/prod/*`

Reference architecture:

- [scripts/aws/REFERENCE_ARCHITECTURE.md](../../scripts/aws/REFERENCE_ARCHITECTURE.md)
- [scripts/aws/REFERENCE_ARCHITECTURE_C4.md](../../scripts/aws/REFERENCE_ARCHITECTURE_C4.md)

## 2. Required Access

You will receive these separately from the team:

- AWS account access for account `246599827879`
- An AWS CLI profile or IAM user for `preventia`
- Required app secrets for Daily, Stream, Google, Apple, Razorpay, etc.
- Any production admin bootstrap secret, if needed

## 3. Local AWS Setup

Configure your CLI profile:

```bash
aws configure --profile preventia
aws sts get-caller-identity --profile preventia
```

Expected region:

- `ap-south-1`

## 4. Files You Need

The production deployment flow uses:

- `scripts/aws/.env.aws.example`
- `scripts/aws/deploy.sh`
- `scripts/aws/verify.sh`
- `scripts/aws/debug-apprunner-logs.sh`

Create the real env file locally:

```bash
cd <repo-root>/scripts/aws
cp .env.aws.example .env.aws
```

Never commit `.env.aws`.

## 5. Fill `.env.aws`

Use placeholders like these and replace them with real values you receive:

```bash
RDS_HOST=<filled-after-rds-setup-or-existing-endpoint>
POSTGRES_PASSWORD=<prod-db-password>
DB_NAME=preventia_db
DB_USER=preventia_admin

REDIS_HOST=<filled-after-redis-setup-or-existing-endpoint>

JWT_SECRET=<32-plus-byte-secret>

DAILY_API_KEY=<daily-api-key>
DAILY_WEBHOOK_SECRET=<daily-webhook-secret-or-STUB>

STREAM_API_KEY=<stream-api-key>
STREAM_API_SECRET=<stream-api-secret>

AWS_ACCESS_KEY_ID_APP=<app-iam-access-key>
AWS_SECRET_ACCESS_KEY_APP=<app-iam-secret>
S3_BUCKET_NAME=preventia-mvp-prescriptions

GOOGLE_CLIENT_ID=<google-web-client-id>
APPLE_CLIENT_ID=<apple-services-id>
APPLE_REDIRECT_URI=<https://your-web-domain-or-callback>

RAZORPAY_API_KEY=<or-STUB>
RAZORPAY_API_SECRET=<or-STUB>
RAZORPAY_WEBHOOK_SECRET=<or-STUB>
```

## 6. One-Time Bootstrap for a Fresh Environment

Run this only when provisioning the environment from scratch.

### Step 0 — Create the deploy IAM user

If the AWS account is not already prepared:

```bash
cd scripts/aws
export AWS_PROFILE=<admin-capable-profile>
./00-setup-deploy-iam.sh
```

Then switch back to the normal deploy profile:

```bash
export AWS_PROFILE=preventia
```

### Step 1 — Provision infrastructure

```bash
cd scripts/aws
chmod +x *.sh
export AWS_PROFILE=preventia

./01-setup-ecr.sh
./02-setup-rds.sh
./03-setup-elasticache.sh
./03a-setup-storage-iam.sh
./04-setup-secrets.sh
./04a-setup-vpc-connector.sh
./05-setup-apprunner.sh
```

Important:

- `03a-setup-storage-iam.sh` can fill in app IAM access keys and bucket name for you.
- `04a-setup-vpc-connector.sh` builds the App Runner private networking needed for RDS and Redis.
- If you recreate the API service, the web service may need to be rebuilt so it picks up the latest API URL.

## 7. Standard Release Flow

For a normal deployment after the environment already exists:

```bash
cd scripts/aws
export AWS_PROFILE=preventia

./deploy.sh both
./verify.sh
```

Deploy just one service:

```bash
./deploy.sh api
./deploy.sh web
```

If the API service was recreated or its App Runner URL changed, run:

```bash
./deploy.sh web
```

## 8. Verification Commands

Basic:

```bash
./verify.sh
```

Inspect App Runner services:

```bash
aws apprunner list-services --region ap-south-1 --profile preventia
```

Deep debug:

```bash
./debug-apprunner-logs.sh preventia-api 200
./debug-apprunner-logs.sh preventia-web 200
```

Check identity:

```bash
aws sts get-caller-identity --profile preventia
```

## 9. Production Admin Bootstrap

The API supports a one-time admin bootstrap endpoint.

Make sure the API has:

```bash
APP_ADMIN_BOOTSTRAP_SECRET=<secure-random-secret>
```

Then call:

```bash
curl -X POST https://<api-domain>/api/v1/auth/bootstrap-admin \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Bootstrap-Secret: <secure-random-secret>' \
  -d '{
    "name": "Platform Admin",
    "email": "<admin-email>",
    "password": "<strong-password>"
  }'
```

Use this only for the first admin. After that, manage admins through the admin UI or backend role-management APIs.

## 10. Troubleshooting

### App Runner `CREATE_FAILED`

Run:

```bash
./debug-apprunner-logs.sh preventia-api 200
```

Typical causes:

- bad secret values in `preventia/prod/*`
- RDS connectivity issues
- VPC connector misconfiguration
- weak JWT secret

### Web works locally but fails on AWS

Rebuild the web service:

```bash
./deploy.sh web
```

The web layer proxies some API traffic and can drift if the API service URL changed.

### RDS access from your laptop times out

The prod DB is usually private. Use a bastion / AWS-native path, or temporarily authorize your IP if the team approves it.

### You updated `.env.aws` but nothing changed

You still need to push the new values into Secrets Manager and refresh App Runner:

```bash
./04-setup-secrets.sh
./05-setup-apprunner.sh
```

## 11. Deployment Safety Rules

- Never commit `.env.aws`
- Never paste live secrets into docs or tickets
- Rotate any credential immediately if it is exposed
- Verify `git status` before pushing
- Prefer `./verify.sh` before announcing a deployment as complete
