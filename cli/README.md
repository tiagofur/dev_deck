# devdeck — CLI

> Tu memoria externa de desarrollo, desde la terminal.

`devdeck` es el compañero de línea de comandos de [DevDeck](https://devdeck.ai).
Habla con el mismo backend que la app desktop y la web via `POST /api/items/capture`,
así que cualquier cosa que captures desde la terminal aparece al instante en los demás
clientes.

Spec completa: [`docs/CAPTURE.md §Canal 2`](../docs/CAPTURE.md#canal-2--cli-devdeck).

## Instalación

```bash
# Desde el repo:
go install ./cli/cmd/devdeck

# (Homebrew tap + Scoop manifest — pendientes)
```

## Primer uso

```bash
devdeck config set api-url http://localhost:8080       # o tu instancia hosted
devdeck login --token tu-api-token
devdeck status                                          # verificar setup
```

## Comandos

| Comando | Qué hace |
|---|---|
| `devdeck add <url\|text>` | Captura un item. Detecta tipo automáticamente. |
| `devdeck search <query>` | Busca cross-entity en repos + cheatsheets + entries. |
| `devdeck list` | Lista tus repos (filtros `--lang`, `--tag`, `--query`, `--limit`). |
| `devdeck status` | Imprime config, token y estado del backend. |
| `devdeck login` / `logout` | Maneja el token en el keychain del OS. |
| `devdeck config [get\|set]` | Edita `~/.config/devdeck/config.toml`. |
| `devdeck import github-stars` | Importa tus (o ajenas) GitHub Stars. |

### Ejemplos

```bash
# Capturar un repo
devdeck add https://github.com/charmbracelet/bubbletea

# Capturar un comando con tag + razón
devdeck add "brew install ripgrep" --type cli --tags terminal --why "grep turbo"

# Capturar vía pipe
history | rg brew | devdeck add --type cli

# Importar GitHub stars de un usuario público
devdeck import github-stars --user charmbracelet --limit 50

# Buscar
devdeck search "tui framework"
```

## Dónde vive el estado

| Qué | Dónde |
|---|---|
| Config | `~/.config/devdeck/config.toml` (o `$XDG_CONFIG_HOME/devdeck/`) |
| Token | OS keychain vía `zalando/go-keyring` (Keychain / Secret Service / Credential Manager) |
| Fallback token | `~/.local/share/devdeck/keyring.json` (0600) — solo cuando no hay daemon de keyring |

## Dev

```bash
cd cli
go test ./...       # tests puros, no tocan ni DB ni keychain real
go build -o devdeck ./cmd/devdeck
./devdeck status
```
