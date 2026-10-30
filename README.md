# vincent-software-factory-tetris

A playable Tetris clone built with **React 19**, **TypeScript** and **Vite**.

## Features

- Classic 10×20 board with all 7 tetrominoes (7-bag randomizer)
- Keyboard controls with simple wall kicks for rotation
- Ghost piece showing where the current piece will land
- Scoring, line counter and levels (speed increases every 10 lines)
- Next-piece preview
- Pause / resume (also auto-pauses when the window loses focus) and restart

## Getting started

Requires Node.js 20+ (the repo pins Node 24 via `mise.toml`).

```bash
npm install
npm run dev        # start the dev server, then open the printed URL (default http://localhost:5173)
```

Other commands:

| Command             | Description                                   |
| ------------------- | --------------------------------------------- |
| `npm run build`     | Type-check and build for production to `dist/` |
| `npm run preview`   | Serve the production build locally            |
| `npm test`          | Run the unit and component tests (Vitest)     |
| `npm run typecheck` | Run the TypeScript compiler without emitting  |

The same tasks are available through mise: `mise run dev`, `mise run build`, `mise run test`, `mise run lint`.

## How to play

Press **Enter** (or click **Start**) to begin. Move and rotate the falling pieces to fill complete
horizontal lines; full lines are cleared. The game ends when a new piece can no longer enter the board.

### Controls

| Key                      | Action                     |
| ------------------------ | -------------------------- |
| `←` / `→` (or `A` / `D`) | Move left / right          |
| `↓` (or `S`)             | Soft drop                  |
| `↑` / `X` (or `W`)       | Rotate clockwise           |
| `Z`                      | Rotate counter-clockwise   |
| `Space`                  | Hard drop                  |
| `P` / `Esc`              | Pause / resume             |
| `R`                      | Restart                    |
| `Enter`                  | Start a new game           |

The **Pause** and **Restart** buttons in the side panel do the same thing as the keys.

### Scoring

| Action          | Points               |
| --------------- | -------------------- |
| Single line     | 100 × level          |
| Double          | 300 × level          |
| Triple          | 500 × level          |
| Tetris (4 lines)| 800 × level          |
| Soft drop       | 1 per cell           |
| Hard drop       | 2 per cell           |

You start at level 1 and go up one level every 10 lines. Pieces fall faster at each level.

## Project structure

```
src/
  game/tetris.ts       # pure game logic (board, pieces, rotation, collisions, scoring)
  game/tetris.test.ts  # unit tests for the game logic
  useTetris.ts         # React hook: reducer, gravity timer, keyboard handling
  App.tsx              # board, next-piece preview, stats, controls UI
  App.test.tsx         # component tests (jsdom)
  styles.css
```

## Deploying to AWS

The app is hosted as a static site: a **private** S3 bucket (all public access
blocked, SSE, TLS-only) served through **CloudFront with Origin Access Control**.
The bucket policy only allows `s3:GetObject` from this specific distribution.
Infrastructure is defined in [`infra/template.yaml`](infra/template.yaml) (CloudFormation).

Prerequisites: AWS CLI v2 and credentials allowed to manage CloudFormation, S3 and CloudFront.

```bash
mise run deploy             # or: infra/deploy.sh [stack-name]   (default stack: tetris-site)
```

The script builds the production bundle, creates or updates the stack, syncs `dist/` to the
bucket (hashed assets cached as immutable, `index.html` set to `no-cache`), invalidates
CloudFront, and prints the `CloudFront URL`. Get the URL again later with:

```bash
aws cloudformation describe-stacks --stack-name tetris-site \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" --output text
```

The bucket has `DeletionPolicy: Retain`. If you delete the stack, empty and delete the bucket yourself.
