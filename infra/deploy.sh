#!/usr/bin/env bash
# End-to-end deploy: base infra -> build image (CodeBuild) -> migrate/seed -> App Runner.
# Requires: terraform, aws CLI (authenticated), git. Run from the infra/ directory.
# Assumes terraform.tfvars is filled in and the repo HEAD is committed.
set -euo pipefail
cd "$(dirname "$0")"
REPO_ROOT="$(cd .. && pwd)"

echo "==> 1/5 Provisioning base infrastructure (deploy_service=false)"
terraform apply -auto-approve -var deploy_service=false

SRC_BUCKET=$(terraform output -raw source_bucket)
CB=$(terraform output -raw codebuild_project)
DOCS=$(terraform output -raw docs_bucket)
DBURL=$(terraform output -raw database_url)
REGION=$(terraform output -raw rds_endpoint >/dev/null 2>&1; terraform output -json | python3 -c 'import json,sys;print(json.load(sys.stdin).get("aws_region",{}).get("value",""))' 2>/dev/null || true)
REGION=${REGION:-$(aws configure get region || echo us-east-1)}

echo "==> 2/5 Packaging source and uploading to s3://$SRC_BUCKET/source.zip"
git -C "$REPO_ROOT" archive --format=zip -o "$REPO_ROOT/source.zip" HEAD
aws s3 cp "$REPO_ROOT/source.zip" "s3://$SRC_BUCKET/source.zip"
rm -f "$REPO_ROOT/source.zip"

echo "==> 3/5 Building image in CodeBuild"
BUILD_ID=$(aws codebuild start-build --project-name "$CB" --query 'build.id' --output text)
echo "    build: $BUILD_ID"
while true; do
  STATUS=$(aws codebuild batch-get-builds --ids "$BUILD_ID" --query 'builds[0].buildStatus' --output text)
  [ "$STATUS" = "IN_PROGRESS" ] || break
  sleep 10
done
echo "    build status: $STATUS"
[ "$STATUS" = "SUCCEEDED" ] || { echo "Build failed; see CodeBuild logs."; exit 1; }

echo "==> 4/5 Running migrations, immutability hardening, and seed against RDS"
( cd "$REPO_ROOT"
  DATABASE_URL="$DBURL" npx prisma migrate deploy
  DATABASE_URL="$DBURL" node scripts/apply-immutability.mjs
  DATABASE_URL="$DBURL" STORAGE_DRIVER=s3 S3_BUCKET="$DOCS" AWS_REGION="$REGION" node scripts/seed.mjs
)

echo "==> 5/5 Deploying App Runner service (deploy_service=true)"
terraform apply -auto-approve -var deploy_service=true

echo
echo "Done. Service URL:"
terraform output -raw service_url
echo
