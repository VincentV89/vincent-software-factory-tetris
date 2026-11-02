# Snakes & Ladders — Nokia Edition

An old-school Nokia 3310-style Snakes & Ladders game: monochrome green LCD
(168×96 pixel canvas, hand-made 3×5 pixel font), square-wave beeps, the Nokia
tune on victory, and a clickable phone keypad. Pure HTML/CSS/JS, no dependencies.

## Play
- **5 / Enter / Space** — select, roll the die
- **2 / 8 / ↑ / ↓** — move through menus
- **C / Esc** — back · **#** — toggle sound

Modes: 1 player vs CPU, or 2 players hot-seat. Ladders climb, snakes slide, and
you need the exact roll to land on 100.

## Develop
```
mise run build   # copies src/ -> dist/
mise run lint    # JS syntax check, asset check, CloudFormation validation
mise run test    # game logic + UI smoke tests (node:test)
mise run deploy  # development preview: private S3 + CloudFront (OAC)
```
Preview stack name/region live in `infra/dev.env`; the infrastructure is
`infra/template.yaml`.
