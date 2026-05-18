# DevDeck — Browser Extension (v1.0.0 Stable)

> The browser companion for your Knowledge OS. Capture repositories, documentation, and technical notes with a single click or keyboard shortcut.

## Features
- ✅ **Quick Capture**: Press `Cmd/Ctrl+Shift+D` to save the active tab instantly.
- ✅ **Context Menus**: Right-click any link to save it, or select text to save it as a note.
- ✅ **Interactive Popup**: Add your own notes and tags while capturing.
- ✅ **Secure Sync**: Fully integrated with the DevDeck JWT-based authentication.
- ✅ **Offline Resilient**: Changes are queued locally if the backend is unreachable.

## Architecture
Located in `apps/extension/` within the DevDeck monorepo.
- **Framework**: React 18 + TypeScript + Vite.
- **Styling**: Tailwind CSS (sharing the neo-brutalist theme).
- **Messaging**: MV3 Service Worker for background capture logic.
- **Auth**: Reuses `@devdeck/api-client` with a custom `chrome.storage` adapter.

## Local Development (unpacked)

1. Build the extension from the monorepo root:
   ```bash
   pnpm build:extension
   ```
2. Open `chrome://extensions` in your browser.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `apps/extension/dist` folder.
5. Open the extension **Options** to log in to your DevDeck account.

## Keyboard Shortcut
Default: `Cmd/Ctrl+Shift+D`. You can customize this in `chrome://extensions/shortcuts`.

---
*Part of the DevDeck v1.0.0 Stable release.*
