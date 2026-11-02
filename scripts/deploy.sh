#!/usr/bin/env bash
# Deploys the dev preview: CloudFormation stack (private S3 + CloudFront OAC), uploads dist/, invalidates cache.
set -euo pipefail
cd "$(dirname "$0")/.."
source deploy/dev.env
: "${STACK_NAME:?}" "${AWS_REGION:?}"
[ -f dist/index.html ] || { echo "dist/ missing - run 'mise run build' first" >&2; exit 1; }

echo "Account: $(aws sts get-caller-identity --query Account --output text)  Region: $AWS_REGION  Stack: $STACK_NAME"

aws cloudformation deploy --region "$AWS_REGION" --stack-name "$STACK_NAME" \
  --template-file infra/template.yaml --no-fail-on-empty-changeset

out() { aws cloudformation describe-stacks --region "$AWS_REGION" --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
BUCKET=$(out BucketName); DIST_ID=$(out DistributionId); URL=$(out SiteUrl)

aws s3 sync dist/ "s3://$BUCKET/" --region "$AWS_REGION" --delete --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths '/*' --query Invalidation.Id --output text

echo "Preview URL: $URL"
