# Capture Network Specification

HeapDeck is only useful if it's easy to get information *into* it. This document defines the different "Capture Channels" available.

[Leer en español](CAPTURE.es.md)

---

## 1. Browser Extension
- **Status:** In progress (P0).
- **Core Feature:** One-click save of the active tab.
- **Advanced:** Context menu for saving specific links or text selections.
- **Offline:** Queues saves if the API is unreachable.

---

## 2. CLI `heapdeck`
The terminal-first capture channel.

- **Status:** Available (`go install`).
- **Backend:** point it at the hosted beta (`heapdeck config set api-url https://api.heapdeck.com`) or a self-hosted instance (`http://localhost:8080`).
- **Core Commands:**
    - `heapdeck add <url>`: Save a URL.
    - `heapdeck search <query>`: Fast terminal search.
    - `heapdeck import github-stars`: Batch import your stars.
- **Implementation:** Built with `Cobra` and `go-keyring` for secure auth storage.

---

## 3. Smart Paste (Desktop Only)
The Electron app listens for global paste events (`Cmd/Ctrl + Shift + V`).

- **Logic:**
    - If clipboard is a URL -> Suggest saving as `Repo`.
    - If clipboard looks like a command -> Suggest saving as `CLI`.
    - If clipboard is a code block -> Suggest saving as `Snippet`.
- **UX:** Non-intrusive toast notification in the corner: *"URL detected. Save to HeapDeck?"*

---

## 4. Share Target (PWA)
When accessed as a PWA on mobile, HeapDeck appears in the native "Share" menu.

- **Flow:** User shares link from mobile browser -> HeapDeck opens -> `CaptureModal` pre-filled.

---

## 5. AI-Assisted `why_saved`
The biggest friction in saving is explaining *why* you saved it.
- **Feature:** AI suggests 3 possible reasons based on page content.
- **UX:** Clickable chips to quickly fill the `why_saved` field.

---

## Success Metrics
- **Speed:** Capture-to-save time < 2s.
- **Usage:** > 50% of items should come from non-app channels (CLI, Extension).
- **Retention:** Higher percentage of items with meaningful `why_saved` notes.
