# Deploying to AWS (App Runner + RDS)

This provisions, in your AWS account:

- **VPC** (2 public subnets, IGW) — no NAT gateway
- **RDS Postgres** (`db.t4g.micro`, encrypted)
- **S3** — a private, encrypted bucket for document blobs
- **ECR** — the container image repository
- **CodeBuild** — builds the `Dockerfile` in-cloud and pushes to ECR (so no local Docker is needed)
- **Secrets Manager** — `DATABASE_URL` and `AUTH_SECRET`
- **App Runner** — runs the image, reaching RDS privately via a VPC connector

The container image is the portable artifact — the same image runs on App Runner,
ECS, Cloud Run, Kubernetes, or any Docker host. CodeBuild is only how *this* deploy
builds it without a local Docker daemon.

## Prerequisites

- `terraform` ≥ 1.6, `aws` CLI (authenticated), `git`, Node ≥ 22.
- `cp example.tfvars terraform.tfvars` and fill it in (DB password, auth secret,
  runtime role password, your public IP `/32`).

## One-command deploy

```bash
cd infra
terraform init
./deploy.sh        # base infra -> build image -> migrate/seed -> App Runner
```

`deploy.sh` prints the public App Runner URL at the end.

## Manual steps (what deploy.sh automates)

```bash
# 1. Base infrastructure (no service yet)
terraform apply -var deploy_service=false

# 2. Package the committed source and hand it to CodeBuild
git -C .. archive --format=zip -o ../source.zip HEAD
aws s3 cp ../source.zip "s3://$(terraform output -raw source_bucket)/source.zip"

# 3. Build + push the image
aws codebuild start-build --project-name "$(terraform output -raw codebuild_project)"
#    (wait for SUCCEEDED)

# 4. Schema, immutability hardening, and seed (from your allowlisted IP)
export DATABASE_URL="$(terraform output -raw database_url)"
npx prisma migrate deploy
node scripts/apply-immutability.mjs
STORAGE_DRIVER=s3 S3_BUCKET="$(terraform output -raw docs_bucket)" node scripts/seed.mjs

# 5. Create the App Runner service
terraform apply -var deploy_service=true
terraform output service_url
```

## Updating the app later

Commit changes, then rebuild + redeploy:

```bash
git -C .. archive --format=zip -o ../source.zip HEAD
aws s3 cp ../source.zip "s3://$(terraform output -raw source_bucket)/source.zip"
aws codebuild start-build --project-name "$(terraform output -raw codebuild_project)"
# App Runner auto_deployments are off; trigger a new deployment:
aws apprunner start-deployment --service-arn "<service-arn>"
```

## Cost & pausing

Roughly ~$20/month running (RDS `t4g.micro` dominates; App Runner is a few dollars,
no ALB/NAT). Pause App Runner between review sessions to cut the compute to ~$0:

```bash
aws apprunner pause-service  --service-arn "<arn>"
aws apprunner resume-service --service-arn "<arn>"
```

## Teardown

```bash
terraform destroy
```

## Production hardening (see ../SECURITY.md)

- Set `admin_ip_cidr = ""` so RDS is not publicly reachable; run migrations via a
  bastion or CI inside the VPC.
- Point the app at the least-privilege `trust_app` role.
- Add AWS WAF, a custom domain + TLS, and wire real Okta/Google SSO.
