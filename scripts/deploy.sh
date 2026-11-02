#!/usr/bin/env bash
# Deploys the game to S3 + CloudFront.
# Requires: AWS CLI v2 and credentials for the target account.
# Usage: STACK_NAME=snakes-ladders AWS_REGION=us-east-1 ./scripts/deploy.sh
set -euo pipefail

STACK_NAME="${STACK_NAME:-nokia-snakes-ladders}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

node "$ROOT/scripts/build.mjs"

echo "Deploying stack $STACK_NAME in $REGION..."
aws cloudformation deploy \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --template-file "$ROOT/infra/template.yaml" \
  --no-fail-on-empty-changeset

output() {
  aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
BUCKET="$(output BucketName)"
DIST_ID="$(output DistributionId)"
URL="$(output SiteUrl)"

echo "Uploading assets to s3://$BUCKET..."
aws s3 sync "$ROOT/dist" "s3://$BUCKET" --region "$REGION" --delete \
  --exclude "index.html" --cache-control "public, max-age=300"
aws s3 cp "$ROOT/dist/index.html" "s3://$BUCKET/index.html" --region "$REGION" \
  --cache-control "no-cache" --content-type "text/html; charset=utf-8"

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" >/dev/null

echo "Deployed: $URL"
