# vincent-software-factory-tetris

A playable Tetris clone built with **React + TypeScript** (Vite), with a development preview
hosted on a **private S3 bucket behind CloudFront** (us-east-1), provisioned with **AWS CDK**.

**Dev preview:** https://d2alnb1ttlphwk.cloudfront.net

## Features

- Standard 10×20 board, 7 tetrominoes, 7-bag randomizer
- Ghost piece showing where the current piece will land
- Next-piece preview
- Scoring, line count, and levels (gravity speeds up every 10 lines)
- Pause/resume and restart (keyboard or on-screen buttons)

## Controls

| Key                | Action      |
| ------------------ | ----------- |
| `←` / `→`          | Move        |
| `↑` or `X`         | Rotate      |
| `↓`                | Soft drop   |
| `Space`            | Hard drop   |
| `P` or `Esc`       | Pause / resume |
| `R`                | Restart     |

## Scoring

| Event                    | Points            |
| ------------------------ | ----------------- |
| Soft drop                | 1 per row         |
| Hard drop                | 2 per row         |
| 1 / 2 / 3 / 4 lines      | 100 / 300 / 500 / 800 × level |

Level = `floor(lines / 10) + 1`. The game ends when a new piece can't spawn.

## Running locally

Requires Node 24 (pinned in `mise.toml`).

```bash
npm install
npm run dev        # http://localhost:5173
```

Other tasks (also available as `mise run <task>`):

```bash
npm run build      # type-check + production build into dist/
npm run lint       # eslint
npm test           # vitest unit + component tests
```

## Project layout

```
src/game/tetris.ts   Pure game logic (board, pieces, collisions, scoring, reducer)
src/App.tsx          React UI, keyboard handling, gravity timer
infra/               AWS CDK app for the dev preview
```

## Deploying the dev preview

The infrastructure lives in `infra/` (`TetrisPreview-dev` stack):

- S3 bucket with all public access blocked, SSE-S3 encryption, and TLS enforced
- CloudFront distribution reading the bucket through **Origin Access Control** (the bucket is
  not publicly readable; direct S3 requests return 403), HTTPS redirect, and security headers
- `BucketDeployment` uploads `dist/` and invalidates the CloudFront cache

Prerequisites: AWS credentials for the target account, and the account/region CDK-bootstrapped
(`npx cdk bootstrap aws://<account>/us-east-1`).

```bash
npm --prefix infra install
mise run deploy                 # = npm run build && npm --prefix infra run deploy
```

The site URL is printed as the `SiteUrl` stack output (also written to `infra/cdk-outputs.json`).
To tear it down: `npm --prefix infra run destroy`.
