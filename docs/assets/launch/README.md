# Launch demo assets

These assets are generated from the local web app with safe demo data. They do not contain private user data or production records.

## Regenerate

Start the web app:

```bash
pnpm -F @heapdeck/web dev --host 127.0.0.1 --port 5173
```

Capture screenshots:

```bash
node scripts/capture-launch-assets.mjs
```

Regenerate the animated demo GIF:

```bash
magick \
  docs/assets/launch/heapdeck-vault.png \
  docs/assets/launch/heapdeck-workbench.png \
  docs/assets/launch/heapdeck-circles.png \
  docs/assets/launch/heapdeck-circle-detail.png \
  -resize 960x -layers Optimize -delay 130 -loop 0 \
  docs/assets/launch/heapdeck-demo-loop.gif
```

## Files

- `heapdeck-demo-loop.gif` — short README demo loop.
- `heapdeck-vault.png` — launch-safe Vault screenshot.
- `heapdeck-workbench.png` — Developer Workbench screenshot.
- `heapdeck-circles.png` — Circles overview screenshot.
- `heapdeck-circle-detail.png` — shared Circle vault screenshot.
