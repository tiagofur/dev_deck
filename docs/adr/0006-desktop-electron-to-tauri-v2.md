# ADR 0006: Desktop Shell — Migrate from Electron to Tauri v2

**Status:** Proposed (research + plan, not yet implemented)
**Date:** October 2026
**Relates to:** ADR 0003 (monorepo), ADR 0004 (auth token storage), ADR 0005 (offline sync)

---

## Context

The desktop app (`apps/desktop`) is an Electron 44 shell around the same React
frontend as the web app. Product rule (ROADMAP §16.13): **desktop = the web app
plus native superpowers** — pages and components live once in
`@heapdeck/features` / `@heapdeck/api-client` / `@heapdeck/ui` and both apps
consume them.

Why migrate: Electron bundles a full Chromium per install (~100 MB+ download,
heavy RAM, slow cold start). Tauri v2 uses the OS webview (WKWebView on macOS,
WebView2 on Windows, WebKitGTK on Linux), shipping a small Rust binary
(typically 5–15 MB installed) with a hardened permission model (capabilities,
CSP by default, no Node in the renderer).

### Current Electron surface (what must be ported)

The native surface is small and well-isolated:

- `src/main/index.ts` (~390 lines): token storage via `safeStorage` (OS
  keychain-encrypted file in `userData`), OS-global shortcuts (configurable,
  persisted in `shortcuts.json`), `heapdeck://` deep link for OAuth callback,
  single-instance lock, `shell.openExternal` for http(s) URLs, arbitrary
  `child_process.exec` (`shell:run`), project detection (`process.cwd()` +
  `git config --get remote.origin.url`), CORS-free `fetch` proxy
  (`api-tester:send`), navigation/window-open guards.
- `src/preload/index.ts` (~79 lines): `contextBridge` exposing
  `window.electronAPI` (`store`, `shortcuts`, `onShortcut`, `auth`, `shell`,
  `project`, `apiTester`).
- 11 consumer touchpoints of `window.electronAPI`:
  - `packages/features`: `ShortcutsModal`, `AgentChat`, `OnboardingChecklist`,
    `Workbench/ProjectContextTool`, `Workbench/ApiTool`, `ItemDetailPage`.
  - `packages/api-client`: `auth/storage/electron.ts`, `sync/engine.ts`
    (device detection only).
  - `apps/desktop` renderer: `main.tsx`, `App.tsx` (AuthBridge + onShortcut),
    `LoginPage.tsx` (openExternal for OAuth).

Key pre-existing seams that make this migration cheap:

1. **`TokenStorage` DI** (`setTokenStorage`) — apps inject their adapter.
2. **`DatabaseAdapter` DI** (`setDatabaseAdapter`) in
   `packages/api-client/src/local-db/client.ts` — the interface doc literally
   anticipates "OPFS (Web), IPC (Electron), or Native (Mobile)". The offline
   SQLite layer runs on `sqlocal` (SQLite-WASM + OPFS), which requires
   cross-origin isolation (COOP/COEP — nginx already sets it for web prod).
   Nobody uses the legacy `getLocalDB()` direct export, so the adapter is
   swappable.
3. Renderer is a standard Vite + React + HashRouter app; the Playwright e2e
   suite already runs **renderer-only** in Chromium against a Vite server
   (plain `vite.e2e.config.ts`, no Electron involved).

There is no installed user base yet (pre-launch), so **no data migration** is
required — losing the old `tokens.enc`/`shortcuts.json` just means re-login and
default shortcuts.

## Decision

Migrate `apps/desktop` from Electron to **Tauri v2**, keeping the renderer and
all shared packages unchanged in behavior, by:

1. **Introducing a platform-agnostic `DesktopBridge`** (in
   `packages/api-client`, alongside the existing DI seams) so shared packages
   stop referencing `window.electronAPI` by name. The bridge refactor ships
   first **while Electron is still the shell**, verified by the existing test
   suites; Tauri then becomes a pure "new shell" change.
2. **Native SQLite on desktop** via `tauri-plugin-sql`, injected through
   `setDatabaseAdapter()`. This replaces `sqlocal`/OPFS in the desktop build
   and sidesteps the biggest webview-compat risk entirely (details in Risks).
3. **Tokens in the real OS keychain** via the Rust `keyring` crate, behind an
   in-memory cache hydrated once at startup (the `TokenStorage` interface is
   synchronous; Tauri IPC is not).
4. **Keep `HashRouter`** — most reliable on Tauri's custom asset protocol
   (`tauri://localhost` / `http://tauri.localhost`). BrowserRouter works in
   dev (Vite fallback) and mostly in prod, but custom-protocol Referer/quirks
   make it not worth the risk.

### Version pins (verified 2026-10-26)

| Crate / npm package | Version |
|---|---|
| `tauri` / `tauri-build` (crates) | 2.12.5 / 2.7.4 |
| `@tauri-apps/cli` / `@tauri-apps/api` | 2.12.4 / 2.12.4 |
| `tauri-plugin-deep-link` | 2.6.2 |
| `tauri-plugin-single-instance` (Rust-only) | 2.5.4 |
| `tauri-plugin-global-shortcut` | 2.4.1 |
| `tauri-plugin-opener` | 2.7.2 |
| `tauri-plugin-http` | 2.8.3 |
| `tauri-plugin-sql` | 2.6.0 |
| `tauri-plugin-store` | 2.5.0 |
| `tauri-plugin-updater` (later) | 2.14.0 |
| `keyring` (crates) | 4.2.0 |

Local toolchain is ready: rustc/cargo 1.99 (Homebrew), Xcode CLT, pnpm 10.33,
Node 26.

## API mapping

| Electron today | Tauri v2 replacement | Notes |
|---|---|---|
| `safeStorage` + `tokens.enc` | `keyring` crate (macOS Keychain / Windows Credential Manager / Linux Secret Service) | **Must** enable platform features (`apple-native`, `windows-native`, `sync-secret-service`) or keyring 4 silently compiles a mock store. |
| `globalShortcut` + `shortcuts.json` | `tauri-plugin-global-shortcut`, registered **Rust-side** | `CommandOrControl+K` accelerator syntax parses as-is; same JSON config in `app_data_dir()`. Rust-side registration guarantees the handler fires + focuses the window even if the webview is throttled. |
| `app.setAsDefaultProtocolClient('heapdeck')` + `open-url` + `second-instance` | `tauri-plugin-deep-link` + `tauri-plugin-single-instance` (with `deep-link` feature) | Scheme `heapdeck` in `tauri.conf.json` (`plugins.deep-link.desktop.schemes`). Single-instance must be the **first** registered plugin. |
| `shell.openExternal` | `tauri-plugin-opener` (`openUrl`) | `opener:default` permission already scopes to http(s)/mailto/tel. |
| `ipcMain shell:run` (`exec`) | Custom `#[tauri::command] run_command` using `tokio::process` (`sh -c` / `cmd /C`) | Same semantics as today (stdout else stderr else error). Improvements while we're at it: timeout + output cap. No `tauri-plugin-shell` needed — app commands don't require capability entries. |
| `project:detect-current` | Custom command: `std::env::current_dir()` + `git config --get remote.origin.url` | Same (limited) semantics — `cwd` is only meaningful when launched from a terminal. Fix properly later with `tauri-plugin-dialog` folder picker. |
| `api-tester:send` (CORS-free fetch) | `tauri-plugin-http` (`fetch` from `@tauri-apps/plugin-http`) | Runs through Rust reqwest, no CORS. Capability scoped to `http://**` + `https://**`. |
| `BrowserWindow` opts | `app.windows[0]` in `tauri.conf.json` | 1280×800, min 900×600, `title: "HeapDeck"`, `backgroundColor: "#FFFBF0"`, `visible: false` + show after first render. |
| `setWindowOpenHandler` / `will-navigate` deny | `WebviewWindowBuilder::on_navigation` (build the window in Rust `setup`) + opener's anchor interception for `target="_blank"` | Mirrors Electron's defense-in-depth: only app URLs navigate in-app; external http(s) goes to the system browser. |
| `window-all-closed` / `activate` | Default Tauri behavior + `RunEvent::Reopen` (macOS dock click) if needed | |
| `webContents.send(...)` | `app.emit(...)` + `listen()` via `@tauri-apps/api/event` | For `global-shortcut` / `global-shortcut-status` / deep-link URLs. |
| `loadFile` / `ELECTRON_RENDERER_URL` | `build.frontendDist` / `build.devUrl` in `tauri.conf.json` | `beforeDevCommand: pnpm vite`, `beforeBuildCommand: pnpm vite build`. |
| sqlocal (OPFS SQLite-WASM) | **Native** SQLite via `tauri-plugin-sql`, behind existing `setDatabaseAdapter()` | Same SQL dialect (plain SQLite), same `heapdeck.db` schema/migrations. Faster, no WASM, no COOP/COEP. |

## Architecture

### DesktopBridge (Phase 0 — ships with Electron still active)

```ts
// packages/api-client/src/platform/bridge.ts
export interface DesktopBridge {
  readonly kind: 'electron' | 'tauri'
  auth: {
    openExternal(url: string): void
    getPendingCallbackURL(): string | null
    onCallbackURL(cb: (url: string) => void): () => void
  }
  onShortcut(cb: (name: string) => void): () => void
  shortcuts: {
    getStatus(): Promise<Record<string, { accelerator: string; registered: boolean }>>
    getConfig(): Promise<{ enabled: boolean; search: string; add: string }>
    setConfig(cfg: { enabled: boolean; search: string; add: string }): Promise<{ enabled: boolean; search: string; add: string }>
    onStatus(cb: (s: Record<string, { accelerator: string; registered: boolean }>) => void): () => void
  }
  shell: { runCommand(cmd: string): Promise<string> }
  project: { detectCurrent(): Promise<{ name: string; path: string; gitRemote: string; gitSlug: string }> }
  apiTester: { send(req: ApiTesterRequest): Promise<ApiTesterResponse> }
}

export function setDesktopBridge(b: DesktopBridge): void
export function getDesktopBridge(): DesktopBridge | null
export function isDesktopApp(): boolean
```

All 11 consumer touchpoints switch from `window.electronAPI` /
`(window as any).electronAPI` to `getDesktopBridge()` / `isDesktopApp()`
(this also removes the `eslint-disable` casts). The Electron adapter lives in
`packages/api-client/src/platform/electron.ts` (`createElectronBridge()`,
returns `null` outside Electron) and the desktop `main.tsx` registers it
explicitly, mirroring `setTokenStorage`. The full preload contract is the
exported `ElectronPreloadAPI` type and the preload script `satisfies` it, so
the shape Electron exposes and the shape the adapter consumes are checked
against each other at compile time — previously nothing enforced that. The
renderer's global `electron.d.ts` is deleted: typing `window.electronAPI` in
shared or renderer code is now a type error by design. Unit tests get
simpler: `setDesktopBridge(mock)` instead of mocking `window`.

### Token storage (sync interface over async IPC)

```ts
// TauriTokenStorage implements TokenStorage with an in-memory cache
export const tauriTokenStorage: TokenStorage & { hydrate(): Promise<void> } = {
  cache: { access: null, refresh: null },
  getAccess() { return cache.access },        // sync — matches TokenStorage
  getRefresh() { return cache.refresh },
  setTokens(a, r) { cache = {a, r}; void invoke('set_tokens', {a, r}) }, // fire-and-forget
  clear() { cache = {null, null}; void invoke('clear_tokens') },
  async hydrate() { cache = await invoke('get_tokens') },
}
```

`main.tsx` becomes an async bootstrap: `await hydrate()` **before**
`ReactDOM.createRoot().render(...)` so the first `isLoggedIn()` check sees
tokens. Rust side is `keyring::Entry` get/set/delete for `access_token` /
`refresh_token` under service `com.heapdeck.desktop`.

### Native SQLite (desktop)

`TauriSqlAdapter implements DatabaseAdapter` calling
`@tauri-apps/plugin-sql` (`Database.load('sqlite:heapdeck.db')`), injected via
`setDatabaseAdapter()` in the Tauri `main.tsx`. Web keeps `sqlocal`/OPFS
unchanged. `LOCAL_SCHEMA`/`LOCAL_MIGRATIONS` run as-is (plain SQLite).

### Rust process sketch

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // deep-link feature auto-forwards the URL; just surface the window
            if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.set_focus(); }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            app.deep_link().register_all()?;   // dev-time scheme registration (not possible on macOS)
            shortcuts::register(app.handle())?; // reads shortcuts.json from app_data_dir()
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            tokens::get_tokens, tokens::set_tokens, tokens::clear_tokens,
            shortcuts::get_status, shortcuts::get_config, shortcuts::set_config,
            shell::run_command, project::detect_current,
        ])
        .run(tauri::generate_context!())
        .expect("error while running HeapDeck");
}
```

Window created in `setup` via `WebviewWindowBuilder::from_config` +
`.on_navigation(...)` to replicate Electron's `will-navigate` guard.

## Plan & estimate

| Phase | Content | Estimate |
|---|---|---|
| **0 — Bridge refactor** (Electron still shipping) — **✅ done 2026-10-26** | `DesktopBridge` in api-client; 11 touchpoints ported; `createElectronBridge` adapter; preload `satisfies ElectronPreloadAPI`; `electron.d.ts` removed; +11 unit tests; typecheck/tests/lint/build green | 0.5–1 d |
| **1 — Tauri scaffold** — **✅ done 2026-10-26** | `src-tauri/` (Cargo.toml, tauri.conf.json, capabilities, icons from the brand SVG), plain `vite.config.ts` (port 5174 + /api proxy), window built in `setup` with `on_navigation` guard + opener, CSP/devCsp, `platform/shell.ts` detection (`electron \| tauri \| browser`), `window.open` → opener polyfill, CORS defaults for Tauri origins; `tauri dev` renders the full app, `tauri build --debug` bundles `HeapDeck.app` | 0.5 d |
| **2 — Auth** | keyring tokens + hydrate bootstrap, deep-link + single-instance, AuthBridge/LoginPage port. *macOS caveat below* | 1–1.5 d |
| **3 — Tools** | `run_command`, `detect_current`, api-tester (plugin-http), shortcuts port, `TauriSqlAdapter` + injection | 1 d |
| **4 — Quality & pipeline** | vitest mocks, e2e switches `electron-vite --rendererOnly` → plain `vite`, CI Rust job (toolchain + `cargo check/clippy` + Linux webkit deps + rust-cache), `tauri-action` release matrix, README rewrite, drop `electron`/`electron-builder`/`electron-vite` deps + `pnpm.onlyBuiltDependencies` entry | 1 d |
| **5 — Cross-platform QA** | macOS/Windows/Linux smoke: OAuth deep link, shortcuts, paste interceptor, API tester, offline DB, CSP tighten pass, size/RAM measurements | 1 d |

**Total: ~5–6 working days** for the full, CI-backed, 3-platform migration.
A macOS-only functional spike is ~2–3 days. The time sinks are deep-link
testing (requires bundling on macOS) and cross-platform QA — not code volume.

## Risks & mitigations

1. **Webview divergence (the "same web app" promise).** Electron guarantees
   Chromium everywhere; Tauri uses the OS webview. Mitigation: the web app
   already targets Safari (public web users), so the renderer is WebKit-proven
   by construction. The one renderer API that genuinely differs is
   `sqlocal`/OPFS+SharedArrayBuffer — **eliminated on desktop** by the native
   SQLite adapter (Risk 2 becomes moot). `navigator.clipboard.readText()`
   (PasteInterceptor's Cmd+Shift+V) is gesture-gated in WKWebView — if flaky,
   back the bridge with `tauri-plugin-clipboard-manager`.
2. **OPFS/COOP/COEP on custom protocol.** `sqlocal` needs cross-origin
   isolation; WKWebView may not honor it on `tauri://`. Avoided entirely by
   the native SQLite decision — desktop never loads OPFS.
3. **macOS deep links don't work in `tauri dev`** (scheme registration
   requires a bundled .app). Workflow: test OAuth via `tauri build --debug` +
   install to /Applications; dev-loop fallback is a dev-only "paste callback
   URL" input on the login page (backend's `?device=desktop` flow unchanged,
   `DESKTOP_OAUTH_REDIRECT_URL` already env-configurable). Windows/Linux can
   `register_all()` at runtime in debug builds.
4. **Keychain prompts on unsigned dev builds.** Unsigned binaries get
   re-prompted for keychain access as the signature changes per build.
   Acceptable in dev (click "Always Allow"); resolved properly by signing
   releases. Linux without a Secret Service (headless/minimal WMs) needs a
   documented fallback (env-var or file-based, explicitly insecure).
5. **First Rust build is slow** (~2–5 min cold; ~10–30 s incremental; CI
   needs `rust-cache`). One-time cost, mitigated by caching.
6. **CSP tightening.** Tauri enforces a CSP; needs entries for Google Fonts,
   the API origin, and user-content images (avatars/favicons). Budget an
   afternoon of console-error triage in Phase 5; start permissive-but-sane
   (`default-src 'self'`, explicit `connect-src`, `img-src *`), tighten later.
7. **No `tauri-driver` on macOS** (WebDriver E2E unsupported). We keep the
   existing renderer-only Playwright suite (already Electron-independent).

## Explicitly out of scope for v1 (post-migration backlog)

- Auto-updater (`tauri-plugin-updater`, minisign keys — today Electron has
  `publish: null`, so this is a net gain when added).
- System tray + quick-capture popover, native notifications, window-state
  persistence, `tauri-plugin-dialog`/`fs` project picker.
- macOS signing + notarization / Windows signing (parity with today: unsigned,
  Gatekeeper/SmartScreen warnings on first run).
- Mobile targets (Tauri v2 supports iOS/Android; `DatabaseAdapter` was
  designed with "Native (Mobile)" in mind).

## Open questions

1. ~~Sign releases in the same milestone or keep parity-with-today (unsigned)
   for v1?~~ **Decided 2026-10-26: unsigned v1, sign before public launch.**
2. ~~Unify desktop with the three web-only routes (`/capture-share`, `/waitlist`,
   `/explore`) during the migration or after?~~ **Decided 2026-10-26: after —
   keeps the renderer diff minimal and reviewable.**
3. Flatten `src/renderer/src/*` → `src/*` while touching the configs?
   *(Recommend: no, keep the tree; separate chore.)*

## Follow-ups noticed during Phase 1

- **Bundle identifier is `com.heapdeck.desktop`**, not Electron's
  `com.heapdeck.app`: the Tauri CLI warns that identifiers ending in `.app`
  conflict with the macOS bundle extension. App data therefore lives under
  `com.heapdeck.desktop/`; nothing to migrate (pre-launch).
- **CORS.** The Tauri webview origin is `tauri://localhost` (macOS/Linux) /
  `http://tauri.localhost` (Windows), `http://localhost:5174` in dev. Added to
  the backend `CORS_ORIGINS` default, `docker-compose.local.yml` and the deploy
  examples. **Production VPS must add the two Tauri origins before the Tauri
  app ships** (Phase 4/5 checklist). The remote dev API
  (`api.dev-deck.creapolis.dev`, the desktop `.env` default) does not allow
  `http://localhost:5174`, so `tauri dev` against it shows "Load failed" on
  the OAuth providers call — environmental, identical under Electron dev; use
  the local backend for the dev loop.
- **`window.open` is a no-op in the Tauri webview.** Shared features call
  `window.open(url, '_blank')`; `platform/tauri.ts` routes http(s) URLs to the
  opener plugin. `<a target="_blank">` clicks are already intercepted by the
  opener plugin's init script. Together with the Rust `on_navigation` guard
  this reproduces Electron's `setWindowOpenHandler` + `will-navigate` policy.
- Debug bundle is 33 MB unstripped; measure the release build (`lto`,
  `opt-level = "s"`, `strip`) in Phase 5.
- `vite.config.ts` and `vite.e2e.config.ts` are near-duplicates; Phase 4
  should point the e2e `webServer` at `vite.config.ts` and delete the e2e one.
- `tauri dev` on macOS cannot test the `heapdeck://` deep link (Phase 2 will
  use `tauri build --debug` + install to /Applications, as planned).

## Follow-ups noticed during Phase 0

- The desktop renderer bundle ships the `sqlocal` OPFS stack
  (`sqlite3.wasm` ~860 kB + workers ~490 kB). Once the native SQLite adapter
  lands (Phase 3) the Tauri build can drop it from the desktop entry.
