# Snake & Ladder — Retro Nokia Edition

An old school, Nokia 3310-style Snake & Ladder game: monochrome green LCD, 3x5 pixel font,
square-wave beeps and a clickable phone keypad. Play against the CPU or a friend.

**Controls:** `5` / `Enter` / `Space` roll & select · `2`/`8` or arrows navigate menu · `C`/`Esc` back · `*`/`M` sound.
Land exactly on 100 to win.

## Development

```sh
mise run lint    # syntax check
mise run test    # unit tests for game logic (node:test)
mise run build   # lint + test + copy static site to dist/
mise run deploy  # build + deploy dev preview (S3 + CloudFront OAC)
```

Static site lives in `src/`, infrastructure in `infra/template.yaml` (CloudFormation),
preview stack name/region in `deploy/dev.env`.
