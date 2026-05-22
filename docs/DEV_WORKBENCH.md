# DevDeck — Developer Workbench

> Status: product proposal · Last updated: May 2026

DevDeck started as external memory for developers: a place to save, organize, and retrieve repos, CLIs, snippets, prompts, commands, workflows, and notes with context. The next step is not to become an IDE, a generic launcher, or a clone of existing tools.

The next step is more specific:

> **DevDeck turns saved developer knowledge into reusable actions.**

The goal is not to compete head-on with Raycast, Postman, DevToys, Notion, Obsidian, or secret managers. The goal is to become the personal layer where what you find, learn, and use stays connected to concrete actions: copy a command, open a runbook, test a request, format a payload, reuse a snippet, or recover a technical decision.

---

## Product Principle

DevDeck should become a daily tool by doing three things extremely well:

1. **Capture quickly** what a developer does not want to lose.
2. **Retrieve by intent** even when the exact name is forgotten.
3. **Act with low friction** when that knowledge becomes useful again.

The promise is not "all developer tools in one app." The promise is:

> Save once. Find when it matters. Reuse without rebuilding context.

---

## Boundary

Every integrated tool should pass this test:

> **Does this action become more valuable because it is connected to the DevDeck vault?**

If not, it probably belongs in another app.

| Idea | Fits when... | Does not fit when... |
|------|--------------|----------------------|
| JSON formatter | The formatted payload can become a snippet, request, or debugging note. | It only duplicates a generic formatter. |
| JWT decoder | It inspects tokens locally without sending sensitive data out. | DevDeck starts storing tokens without a serious security model. |
| API tester | Quick requests become reusable project items. | It tries to replace full Postman collections. |
| Command palette | It searches vault items, commands, tools, and runbooks. | It tries to replace the whole OS launcher. |
| Clipboard/snippets | It expands explicitly saved snippets. | It silently watches everything by default. |

---

## Recommended Roadmap

### Phase 1 — Workbench MVP

- `Tools` or `Workbench` section.
- JSON formatter / validator.
- Local JWT decoder.
- Base64 / URL tools.
- UUID and timestamp tools.
- Regex tester.
- Local secret scanner for `.env`, logs, commands, and snippets before saving or sharing.
- Copy result.
- Save output as snippet or note.

Status:

- JSON formatter / validator: implemented.
- Local JWT decoder: implemented.
- Base64 and URL encode/decode: implemented.
- UUID and timestamp tools: implemented.
- SHA-1 / SHA-256 hashing: implemented.
- Regex tester: implemented.
- Local secret scanner with masked values: implemented.
- Copy result and save output as item: implemented.

### Phase 2 — Palette MVP

- In-app command palette.
- Search vault items.
- Open tools.
- Copy saved commands.
- Quick item creation.
- Type-specific actions.

Status:

- The palette opens Developer Workbench from the app shell.
- It opens specific tools through deep links (`/workbench?tool=...`) when search matches JSON, JWT, API, `curl`, secrets, regex, etc.
- It can quick-save the current input as a note through capture.
- It copies command search results directly when the result includes command text.

### Phase 3 — Requests and Runbooks

- Lightweight API tester. **Status:** first Workbench version implemented.
- Save request as an item. **Status:** implemented through capture.
- Generate `curl` from a request. **Status:** implemented in Workbench.
- Import a request from `curl`. **Status:** implemented in Workbench.
- Local recent request history. **Status:** implemented in Workbench.
- Associate requests with projects and runbooks.
- Execute documented commands with human confirmation.

Implementation notes:

- Web uses browser `fetch`, so browser CORS still applies.
- Desktop uses a local IPC sender (`electronAPI.apiTester.send`) from the main process, so browser CORS does not apply there.
- The Desktop sender only allows `http`/`https`, accepts explicit headers/body, and returns status, headers, duration, and text body.
- Every request produces reusable JSON config and a copyable/savable `curl` command for terminal, CI, issues, or runbooks.
- Basic `curl` commands can be imported back into method, URL, headers, and body fields.
- Sent or saved requests are kept in a small local recent-history list so they can be reloaded without rebuilding context.

### Phase 4 — Project-Aware DevDeck

- Detect the current repo/folder from Desktop or CLI.
- Surface related items.
- Suggest project commands and runbooks.
- Import non-sensitive local metadata.

### Phase 5 — Advanced Opt-In Features

- Clipboard/snippet expander.
- Screenshot to snippet.
- Local secret scanner before saving or sharing sensitive text. **Status:** implemented in Workbench.
- Secret-manager integrations.
- Global system shortcut.

---

## Sensitive Features

Clipboard history, OCR, and secret management can be valuable, but they require trust. They should be opt-in, transparent, easy to disable, and designed around local-first behavior.

DevDeck should not implement custom cryptography for secrets. If secret handling is added, it should use native secure storage or integrate with established tools such as macOS Keychain, Windows Credential Manager, Linux Secret Service, 1Password, Bitwarden, or `pass`.

---

## Success Metrics

- **Time to capture:** how long it takes to save a new item.
- **Time to reuse:** how long it takes to find and use a command, snippet, or request.
- **Weekly saved items:** items captured per week.
- **Weekly reused items:** items opened, copied, or acted on per week.
- **Tool usage:** workbench utilities used per week.
- **Local trust:** actions completed without network access.
- **Search success:** searches that end in opening, copying, or using an item.

The most important metric is not how many features DevDeck has. It is how often DevDeck prevents a developer from rebuilding context.
