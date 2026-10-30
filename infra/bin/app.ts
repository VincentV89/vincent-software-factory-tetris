#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TetrisPreviewStack } from '../lib/tetris-preview-stack';

const app = new cdk.App();
const envName = app.node.tryGetContext('envName') ?? 'dev';

new TetrisPreviewStack(app, `TetrisPreview-${envName}`, {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
  description: `Tetris ${envName} preview: private S3 bucket served via CloudFront (OAC)`,
});
