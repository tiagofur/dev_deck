# Launch demo assets

These assets are generated from the local web app with safe demo data. They do not contain private user data or production records.

## Regenerate

Start the web app:

```bash
pnpm -F @devdeck/web dev --host 127.0.0.1 --port 5173
```

Capture screenshots:

```bash
node scripts/capture-launch-assets.mjs
```

Regenerate the animated demo GIF:

```bash
magick \
  docs/assets/launch/devdeck-vault.png \
  docs/assets/launch/devdeck-workbench.png \
  docs/assets/launch/devdeck-circles.png \
  docs/assets/launch/devdeck-circle-detail.png \
  -resize 960x -layers Optimize -delay 130 -loop 0 \
  docs/assets/launch/devdeck-demo-loop.gif
```

## Files

- `devdeck-demo-loop.gif` — short README demo loop.
- `devdeck-vault.png` — launch-safe Vault screenshot.
- `devdeck-workbench.png` — Developer Workbench screenshot.
- `devdeck-circles.png` — Circles overview screenshot.
- `devdeck-circle-detail.png` — shared Circle vault screenshot.
