# vincent-software-factory-tetris — Nokia Snakes & Ladders

An old-school Nokia-style **Snakes & Ladders** game: green monochrome LCD, pixel-art
board drawn on a 121×121 canvas, chunky keypad, and square-wave beeps. Static HTML/CSS/JS,
no runtime dependencies. Hosted on a private S3 bucket behind CloudFront (Origin Access Control).

## Play

| Key | Action |
| --- | --- |
| `1` | Start a game vs CPU (from the menu) |
| `2` | Start a 2-player hot-seat game |
| `5`, `OK`, Space, Enter | Roll the die |
| Left soft key / Esc | Back to menu / quit |
| Right soft key / → | Toggle sound |

Rules: land exactly on 100 to win (overshooting forfeits the move), ladders climb,
snakes slide, rolling a 6 gives another roll. P1 is the dotted token, P2/CPU the hollow one.

Run locally: `npx serve web` (or `python3 -m http.server -d web`) and open the page.

## Layout

- `web/` — the game (`game.js` = pure rules, `ui.js` = rendering/input, `index.html`, `style.css`)
- `test/` — `node:test` unit tests for the rules
- `infra/` — AWS CDK stack: S3 bucket (block public access, SSE, TLS only) + CloudFront
  distribution (OAC, HTTPS redirect, security headers) + `BucketDeployment` that uploads `web/`
  and invalidates the cache

## Tasks

```sh
npm ci
mise run test     # unit tests
mise run lint     # eslint + tsc
mise run build    # tests + type-check + cdk synth
mise run deploy   # deploy stack NokiaSnakesLadders-${STAGE:-dev}
```

Deploying needs AWS credentials for the target account and a CDK-bootstrapped
account/region (`npx cdk bootstrap`). The CloudFront URL is printed as the `SiteUrl` stack output.
