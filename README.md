# Snakes & Ladders — Nokia edition

An old-school, Nokia-3310-style Snakes & Ladders game: a monochrome green pixel LCD
(136×83, scaled up), square-wave beeps, and a clickable phone keypad. It's a plain
static site with no dependencies, hosted on a private S3 bucket behind CloudFront.

## Play

Open `site/index.html` in a browser, or run `mise run build` and serve `dist/`.

| Key | Action |
| --- | --- |
| `OK` / `5` / `Enter` / `Space` | Roll the dice / select |
| `▲▼` / `2` `8` / arrow keys | Move through the menu |
| `1` / `2` (in menu) | Start a 1-player (vs CPU) or 2-player game |
| `C` / `Esc` / `Backspace` | Back to the menu |

Rules: everyone starts off the board. A ladder takes you up, a snake takes you down.
Rolling a 6 gives you another turn. You have to land on 100 exactly; if the roll is
too high, you stay where you are.

## Develop

```sh
mise run lint    # syntax-check the JS and validate the CloudFormation template
mise run test    # unit tests for the game logic + headless UI smoke test
mise run build   # lint + test, then copy site/ into dist/
```

`SNAPSHOT_DIR=/tmp/snap mise run test` writes PNG screenshots of the LCD (menu, play, game over).

## Deploy (S3 + CloudFront)

`infra/template.json` is a CloudFormation stack with:

- a private, encrypted, versioned S3 bucket (all public access blocked, TLS-only policy)
- a CloudFront distribution using Origin Access Control, HTTPS redirect, HTTP/2+3,
  compression, the managed CachingOptimized cache policy and SecurityHeaders policy

Deploy from your machine (needs AWS CLI v2 and credentials):

```sh
STACK_NAME=snakes-ladders-nokia AWS_REGION=us-east-1 mise run deploy
```

This builds the site, creates or updates the stack, syncs `dist/` to the bucket
(HTML with `no-cache`, assets with a 5-minute TTL), invalidates CloudFront, and
prints the `https://…cloudfront.net` URL.

You can also deploy from GitHub Actions: add an `AWS_DEPLOY_ROLE_ARN` repository secret
for an OIDC-assumable IAM role, then run the **deploy** workflow by hand.
