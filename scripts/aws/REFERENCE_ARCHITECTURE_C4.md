# Preventia AWS Reference Architecture - C4 Style

This is a cleaner, C4-style reference for the current Preventia AWS setup.

Use it alongside [REFERENCE_ARCHITECTURE.md](/Users/satishjonnala/Documents/Dhanvantri/dhanvanthri-mvp/ops/aws/REFERENCE_ARCHITECTURE.md):
- `REFERENCE_ARCHITECTURE.md` = operational/runtime wiring
- `REFERENCE_ARCHITECTURE_C4.md` = cleaner system-context and container views

## System Context

```mermaid
flowchart TB
    patient["Patients / Caregivers<br/>Use browser to book visits, review care, manage meds"]
    provider["Doctors / Pharmacists / Admins<br/>Use browser to manage operations and care flows"]

    subgraph preventia["Preventia Platform"]
        web["Preventia Web Portal<br/>Next.js on App Runner"]
        api["Preventia API<br/>Spring Boot on App Runner"]
    end

    subgraph aws_data["AWS Managed Data Services"]
        rds["RDS PostgreSQL<br/>preventia-postgres / preventia_db"]
        redis["ElastiCache Redis<br/>preventia-redis"]
        s3["Amazon S3<br/>preventia-mvp-prescriptions"]
    end

    patient --> web
    provider --> web
    web --> api
    api --> rds
    api --> redis
    api --> s3
```

## Container View

```mermaid
flowchart LR
    user["User Browser"]

    subgraph apprunner["AWS App Runner"]
        web["Container: preventia-web<br/>Next.js UI<br/>Public HTTPS"]
        api["Container: preventia-api<br/>Spring Boot API<br/>Public HTTPS + VPC egress"]
    end

    subgraph vpc["Default VPC - ap-south-1"]
        connector["preventia-vpc-connector"]
        sg_app["preventia-apprunner-sg"]
        sg_db["preventia-rds-sg"]
        rds["Container: PostgreSQL<br/>preventia-postgres"]
        redis["Container: Redis<br/>preventia-redis"]
    end

    s3["Container: S3 bucket<br/>preventia-mvp-prescriptions"]
    secrets["Container: Secrets Manager<br/>preventia/prod/*"]
    ecr["Container: ECR repos<br/>preventia/api + preventia/web"]

    user --> web
    web -->|API calls| api
    api --> connector
    connector --> sg_app
    connector --> rds
    connector --> redis
    sg_db --> rds
    api -->|S3 SDK| s3
    ecr -. image source .-> web
    ecr -. image source .-> api
    secrets -. deploy-time config source .-> api
    secrets -. deploy-time config source .-> web
```

## Deployment / Control View

```mermaid
flowchart TB
    dev["Developer machine<br/>AWS CLI + Podman<br/>AWS_PROFILE=preventia"]
    scripts["ops/aws scripts<br/>deploy.sh / 04-setup-secrets.sh / 05-setup-apprunner.sh"]

    subgraph aws["AWS Account - ap-south-1"]
        iam_deploy["IAM user<br/>preventia-deploy"]
        iam_app["IAM user<br/>preventia-app"]
        pull_role["IAM role<br/>AppRunnerECRAccessRole-Preventia"]
        ecr["Amazon ECR"]
        secrets["Secrets Manager"]
        apprunner["App Runner services"]
    end

    dev --> iam_deploy
    dev --> scripts
    scripts --> ecr
    scripts --> secrets
    scripts --> apprunner
    pull_role --> ecr
    iam_app -. runtime S3 credentials .-> apprunner
```

## Reading Guide

- System Context: who uses Preventia and which AWS-managed stores it depends on.
- Container View: the main runtime building blocks and network path.
- Deployment / Control View: how engineers push code and configuration into AWS.

## Current Scope

- This reflects the currently deployed stack.
- It does not include CloudFront, Route53, WAF, or a dedicated production VPC.
- It assumes App Runner remains the public entry point for both web and API.
