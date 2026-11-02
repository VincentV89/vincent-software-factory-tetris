# Snakes & Ladders — Nokia Edition

An old school, Nokia 3310-style Snakes & Ladders game. Everything is drawn pixel by pixel on an
84×48 monochrome "LCD" canvas inside a CSS phone, with square-wave beeps and the classic Nokia tune
when someone wins. It has no runtime dependencies or bundler and is plain static files, hosted on
**S3 + CloudFront**.

## Play

| Action | Keyboard | Phone keypad |
| --- | --- | --- |
| Roll / select | `5`, `Space`, `Enter` | `5` or the left soft key |
| Menu up / down | `↑` `↓` (or `2` / `8`) | ▲ ▼ |
| Back to menu | `Esc`, `Backspace` | `C` / `#` |
| Toggle sound | `M` | `*` |

- **1 PLAYER**: you (solid token) vs the CPU (hollow token). **2 PLAYERS**: two people take turns on one device.
- You start off the board. You need the exact roll to land on 100; if you roll too high, you stay where you are.
- The snakes are wiggly dotted lines with a head; the ladders are double rails.

Run it locally with `npx http-server src` (ES modules need HTTP, so `file://` won't work) and open http://localhost:8080.

## Develop

```sh
mise run lint    # syntax-check JS + verify HTML asset references
mise run test    # unit tests for the game rules (node:test)
mise run build   # copy src/ -> dist/
```

- `src/logic.js`: pure game rules (board layout, moves, snakes and ladders, winning)
- `src/game.js`: LCD renderer, pixel font, animations, sound, input
- `infra/template.yaml`: CloudFormation stack with a private S3 bucket, CloudFront and Origin Access Control

## Deploy (S3 + CloudFront)

You need the AWS CLI v2 and credentials for the target account.

```sh
AWS_REGION=us-east-1 STACK_NAME=nokia-snakes-ladders mise run deploy
```

`scripts/deploy.sh` builds the site and deploys the CloudFormation stack. The stack has:

- a private, encrypted S3 bucket that requires TLS
- CloudFront with Origin Access Control and HTTPS redirects
- managed caching and security-headers policies

The script then syncs `dist/` to the bucket (with `index.html` set to `no-cache`), invalidates
CloudFront and prints the `https://<id>.cloudfront.net` URL.

### CI/CD

- `.github/workflows/ci.yml` runs lint, test and build on PRs and on pushes to `main`.
- `.github/workflows/deploy.yml` deploys on pushes to `main` or by manual dispatch. To enable it:
  1. Create an IAM role that trusts GitHub OIDC for this repo and has permissions for
     CloudFormation, S3 and CloudFront.
  2. Add the repo secret `AWS_DEPLOY_ROLE_ARN`.
  3. Set the repo variable `DEPLOY_ENABLED=true`. `AWS_REGION` and `STACK_NAME` are optional.
