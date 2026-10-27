# heapdeck — CLI

> Tu memoria externa de desarrollo, desde la terminal.

`heapdeck` es el compañero de línea de comandos de [HeapDeck](https://heapdeck.com).
Habla con el mismo backend que la app desktop y la web via `POST /api/items/capture`,
así que cualquier cosa que captures desde la terminal aparece al instante en los demás
clientes.

Spec completa: [`docs/CAPTURE.md §Canal 2`](../docs/CAPTURE.md#canal-2--cli-heapdeck).

## Instalación

```bash
# Desde el submódulo cli/
cd cli
go install ./cmd/heapdeck

# (Homebrew tap + Scoop manifest — pendientes)
```

> Hoy el CLI se distribuye razonablemente vía `go install` o `go build` dentro de `cli/`.
> La distribución empaquetada (Homebrew/Scoop) queda para el release público.

## Primer uso

```bash
# Contra la beta hosteada (creá tu cuenta gratis en https://heapdeck.com/register primero)
heapdeck config set api-url https://api.heapdeck.com
heapdeck login --token tu-api-token
heapdeck status                                          # verificar setup

# Contra un backend local/self-hosteado:
# heapdeck config set api-url http://localhost:8080
```

## Comandos

| Comando | Qué hace |
|---|---|
| `heapdeck add <url\|text>` | Captura un item. Detecta tipo automáticamente. |
| `heapdeck search <query>` | Busca cross-entity en repos + cheatsheets + entries. |
| `heapdeck list` | Lista tus repos (filtros `--lang`, `--tag`, `--query`, `--limit`). |
| `heapdeck open <id>` | Abre la URL fuente de un repo/item en el browser. |
| `heapdeck status` | Imprime config, token y estado del backend. |
| `heapdeck login` / `logout` | Maneja el token en el keychain del OS. |
| `heapdeck config [get\|set]` | Edita `~/.config/heapdeck/config.toml`. |
| `heapdeck import github-stars` | Importa tus (o ajenas) GitHub Stars. |

### Ejemplos

```bash
# Capturar un repo
heapdeck add https://github.com/charmbracelet/bubbletea

# Capturar un comando con tag + razón
heapdeck add "brew install ripgrep" --type cli --tags terminal --why "grep turbo"

# Capturar vía pipe
history | rg brew | heapdeck add --type cli

# Importar GitHub stars de un usuario público
heapdeck import github-stars --user charmbracelet --limit 50

# Buscar
heapdeck search "tui framework"

# Abrir la URL fuente de un repo/item conocido
heapdeck open 2f4d8f3d-7e8a-4f1b-aef7-2d4f4174a123
```

## Alcance actual del P0

- El CLI trabaja **online** contra la API; no hay SQLite local ni sync offline todavía.
- `heapdeck open <id>` abre la **URL fuente** del recurso cuando existe.
- El CLI **no** intenta deducir rutas internas del web app desde `api_url`; si un recurso no tiene `url`, el comando falla con error claro.

## Dónde vive el estado

| Qué | Dónde |
|---|---|
| Config | `~/.config/heapdeck/config.toml` (o `$XDG_CONFIG_HOME/heapdeck/`) |
| Token | OS keychain vía `zalando/go-keyring` (Keychain / Secret Service / Credential Manager) |
| Fallback token | `~/.local/share/heapdeck/keyring.json` (0600) — solo cuando no hay daemon de keyring |

## Dev

```bash
cd cli
go test ./...       # tests puros, no tocan ni DB ni keychain real
go build -o heapdeck ./cmd/heapdeck
./heapdeck status
```
