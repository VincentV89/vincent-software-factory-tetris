#!/usr/bin/env bash
# Deploy the static site to S3 + CloudFront.
# Usage: STACK_NAME=snakes-ladders AWS_REGION=us-east-1 scripts/deploy.sh
# Requires: aws CLI v2, credentials allowed to manage CloudFormation, S3 and CloudFront.
set -euo pipefail

STACK_NAME="${STACK_NAME:-snakes-ladders-nokia}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"

command -v aws >/dev/null || { echo "aws CLI not found" >&2; exit 1; }
[ -f "$DIST/index.html" ] || { echo "dist/ missing - run 'mise run build' first" >&2; exit 1; }

echo "==> Deploying stack $STACK_NAME in $REGION"
aws cloudformation deploy \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --template-file "$ROOT/infra/template.json" \
  --no-fail-on-empty-changeset

output() {
  aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
BUCKET="$(output BucketName)"
DIST_ID="$(output DistributionId)"
URL="$(output SiteUrl)"

echo "==> Uploading site to s3://$BUCKET"
# HTML must always revalidate; assets are small and unhashed, so keep their TTL short.
aws s3 sync "$DIST" "s3://$BUCKET" --region "$REGION" --delete \
  --exclude "*.html" --cache-control "public, max-age=300"
aws s3 sync "$DIST" "s3://$BUCKET" --region "$REGION" --delete \
  --exclude "*" --include "*.html" --cache-control "no-cache" --content-type "text/html; charset=utf-8"

echo "==> Invalidating CloudFront cache"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" >/dev/null

echo "==> Done: $URL"
