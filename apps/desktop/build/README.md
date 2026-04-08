# build/ — Resources for electron-builder

Drop the app icon here. Filenames matter:

- **`icon.ico`** — Windows (256×256 minimum, multi-resolution `.ico`)
- **`icon.icns`** — macOS (built from a 1024×1024 PNG via `iconutil`)
- **`icon.png`** — Linux (512×512 PNG)

Quick generator: https://www.electron.build/icons

If no icon is present, electron-builder uses a default Electron logo (which
looks bad). For now leave it; we'll commission/design proper Snarkel-based
art in Phase 7 (polish).

## Suggestion

Snarkel (the axolotl mascot from `Mascot.tsx`) would make a great app icon.
Export the SVG to PNG at 1024×1024, then run through an icon generator.
