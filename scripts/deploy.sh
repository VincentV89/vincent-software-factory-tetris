#!/usr/bin/env bash
# Deploy the development preview: CloudFormation stack, upload, invalidate, smoke-check.
set -euo pipefail
cd "$(dirname "$0")/.."
source infra/dev.env
export AWS_REGION="$REGION" AWS_DEFAULT_REGION="$REGION"

aws sts get-caller-identity --query Account --output text >/dev/null
bash scripts/build.sh

status=$(aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK_NAME" \
  --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo NONE)
if [ "$status" = "ROLLBACK_COMPLETE" ]; then
  echo "Removing failed initial stack $STACK_NAME"
  aws cloudformation delete-stack --region "$REGION" --stack-name "$STACK_NAME"
  aws cloudformation wait stack-delete-complete --region "$REGION" --stack-name "$STACK_NAME"
fi

aws cloudformation deploy --region "$REGION" --stack-name "$STACK_NAME" \
  --template-file infra/template.yaml --parameter-overrides "BucketSuffix=$BUCKET_SUFFIX" \
  --no-fail-on-empty-changeset

out() { aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
BUCKET=$(out BucketName); DIST=$(out DistributionId); URL=$(out SiteUrl)

aws s3 sync dist/ "s3://$BUCKET/" --region "$REGION" --delete --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id "$DIST" --paths '/*' --query Invalidation.Id --output text

for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$URL/" || true)
  [ "$code" = "200" ] && break
  sleep 10
done
echo "HTTP $code $URL"
[ "$code" = "200" ]
