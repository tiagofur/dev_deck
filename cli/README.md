# heapdeck — CLI

> **Your external development memory, straight from the terminal.**

`heapdeck` is the command-line companion for [HeapDeck](https://heapdeck.com). It interacts with the same backend as the desktop and web apps via the `POST /api/items/capture` endpoint, so anything you capture from the terminal appears instantly on all other clients.

[Leer en español](README.es.md)

Full spec: [`docs/CAPTURE.md §Channel 2`](../docs/CAPTURE.md#channel-2--cli-heapdeck).

---

## Installation

```bash
# From the cli/ directory
cd cli
go install ./cmd/heapdeck

# (Homebrew tap + Scoop manifest — pending)
```

> Currently, the CLI is distributed via `go install` or `go build` within the `cli/` directory. Packaged distribution (Homebrew/Scoop) is planned for the public release.

---

## Getting Started

```bash
# Against the hosted beta (create your free account at https://heapdeck.com/register first)
heapdeck config set api-url https://api.heapdeck.com
heapdeck login --token your-api-token
heapdeck status                                          # verify setup

# Against a local/self-hosted backend instead:
# heapdeck config set api-url http://localhost:8080
```

---

## Commands

| Command | Description |
|---|---|
| `heapdeck add <url|text>` | Captures an item. Auto-detects type. |
| `heapdeck search <query>` | Cross-entity search (repos + cheatsheets + entries). |
| `heapdeck list` | List your repos (filters: `--lang`, `--tag`, `--query`, `--limit`). |
| `heapdeck open <id>` | Opens the source URL of a repo/item in the browser. |
| `heapdeck status` | Prints config, token, and backend health. |
| `heapdeck login` / `logout` | Manages the token in the OS keychain. |
| `heapdeck config [get|set]` | Edits `~/.config/heapdeck/config.toml`. |
| `heapdeck import github-stars` | Imports yours (or others') GitHub Stars. |

### Examples

```bash
# Capture a repo
heapdeck add https://github.com/charmbracelet/bubbletea

# Capture a command with tags and a reason
heapdeck add "brew install ripgrep" --type cli --tags terminal --why "fast grep"

# Capture via pipe
history | rg brew | heapdeck add --type cli

# Import GitHub stars from a public user
heapdeck import github-stars --user charmbracelet --limit 50

# Search
heapdeck search "tui framework"

# Open the source URL of a known repo/item
heapdeck open 2f4d8f3d-7e8a-4f1b-aef7-2d4f4174a123
```

---

## Current Scope (P0)

- The CLI works **online** against the API; there is no local SQLite or offline sync yet.
- `heapdeck open <id>` opens the **source URL** of the resource if it exists.
- The CLI **does not** attempt to derive internal web app paths from the `api_url`; if a resource has no `url`, the command fails with a clear error.

---

## Persistence & Security

| Data | Location |
|---|---|
| Config | `~/.config/heapdeck/config.toml` (or `$XDG_CONFIG_HOME/heapdeck/`) |
| Token | OS keychain via `zalando/go-keyring` (Keychain / Secret Service / Credential Manager) |
| Fallback token | `~/.local/share/heapdeck/keyring.json` (0600) — only if no keyring daemon is present |

---

## Development

```bash
cd cli
go test ./...       # unit tests, no DB or real keychain interaction
go build -o heapdeck ./cmd/heapdeck
./heapdeck status
```
