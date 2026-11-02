# Snakes & Ladders — Nokia Edition

An old-school, Nokia 3310-style Snakes & Ladders game: green monochrome LCD, pixel-art board,
square-wave beeps and a clickable phone keypad. Pure HTML/CSS/JS, no dependencies.

## Play
| Key | Action |
| --- | --- |
| `1` | New game vs CPU |
| `2` | New 2-player (hot-seat) game |
| `5` / `OK` / Space / Enter | Roll the dice |
| `*` / Menu soft key / Esc | New game (or back to title after a win) |
| `#` / `C` | Toggle sound |

Rules: start off-board, exact roll needed to land on 100 (overshoot = stay put), ladders climb,
snakes slide, and rolling a 6 gives another turn. Your token is the filled square ■ and blinks on your turn; the opponent is the hollow □.

## Develop
```sh
mise run test    # unit tests for the rules (node:test)
mise run lint    # syntax check
mise run build   # lint + test + copy site into dist/
mise run serve   # http://localhost:8080
```

## Deploy
`.github/workflows/pages.yml` publishes `dist/` to GitHub Pages on push to `main` (or manual dispatch).
GitHub Pages must be enabled with source "GitHub Actions" in the repo settings.
