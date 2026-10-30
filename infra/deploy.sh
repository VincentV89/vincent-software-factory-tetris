#!/usr/bin/env bash
# Build the Tetris app, provision infra (CloudFormation) and publish dist/ to
# the private S3 bucket behind CloudFront. Prints the CloudFront URL.
#
# Usage: infra/deploy.sh [stack-name]    (default: tetris-site)
# Env:   AWS_REGION (default us-east-1), plus standard AWS credentials.
set -euo pipefail

STACK_NAME="${1:-${STACK_NAME:-tetris-site}}"
export AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Building production bundle"
(cd "$ROOT" && npm ci && npm run build)

echo "==> Deploying stack $STACK_NAME in $AWS_REGION"
aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file "$ROOT/infra/template.yaml" \
  --no-fail-on-empty-changeset

output() {
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
BUCKET="$(output BucketName)"
DIST_ID="$(output DistributionId)"
URL="$(output CloudFrontURL)"

echo "==> Uploading dist/ to s3://$BUCKET"
# Hashed assets: cache forever. index.html and other root files: always revalidate.
aws s3 sync "$ROOT/dist/assets" "s3://$BUCKET/assets" --delete \
  --cache-control "public,max-age=31536000,immutable"
aws s3 sync "$ROOT/dist" "s3://$BUCKET" --delete --exclude "assets/*" \
  --cache-control "no-cache"

echo "==> Invalidating CloudFront cache"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" \
  --query "Invalidation.Id" --output text

echo
echo "CloudFront URL: $URL"
