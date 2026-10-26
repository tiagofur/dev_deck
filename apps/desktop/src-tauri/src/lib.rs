use tauri::{Url, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

/// Only ever hand http(s) URLs to the OS browser. Blocks file://, custom
/// schemes and anything else that could be abused if a malicious URL reaches
/// the open handler.
fn is_safe_external_url(url: &Url) -> bool {
    matches!(url.scheme(), "http" | "https")
}

/// Navigations the webview may perform in-app: the bundled frontend served
/// over Tauri's protocol (`tauri://localhost` on macOS/Linux,
/// `http://tauri.localhost` on Windows) and, in debug builds only, the Vite dev
/// server. In-app routing uses a HashRouter, so legitimate navigation never
/// leaves these origins.
fn is_app_url(url: &Url) -> bool {
    match url.scheme() {
        "tauri" => true,
        "http" | "https" => {
            let host = url.host_str().unwrap_or("");
            host == "tauri.localhost"
                || (cfg!(debug_assertions) && (host == "localhost" || host == "127.0.0.1"))
        }
        _ => false,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // The main window is declared in tauri.conf.json with
            // `create: false` so it can be built here with a navigation
            // handler, which the config alone cannot express.
            let window_config = app
                .config()
                .app
                .windows
                .first()
                .cloned()
                .expect("tauri.conf.json must declare the main window");
            let handle = app.handle().clone();

            WebviewWindowBuilder::from_config(app, &window_config)?
                // Block the top frame from navigating away from the app
                // (defense-in-depth against injected content); external
                // http(s) links go to the system browser instead.
                .on_navigation(move |url| {
                    if is_app_url(url) {
                        return true;
                    }
                    if is_safe_external_url(url) {
                        if let Err(err) = handle.opener().open_url(url.as_str(), None::<&str>) {
                            eprintln!("[heapdeck] failed to open external url: {err}");
                        }
                    }
                    false
                })
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running HeapDeck");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn url(s: &str) -> Url {
        Url::parse(s).expect("valid test url")
    }

    #[test]
    fn external_urls_are_only_http_and_https() {
        assert!(is_safe_external_url(&url("https://github.com/x")));
        assert!(is_safe_external_url(&url("http://localhost:8080/")));
        assert!(!is_safe_external_url(&url("file:///etc/passwd")));
        assert!(!is_safe_external_url(&url("javascript:alert(1)")));
        assert!(!is_safe_external_url(&url("heapdeck://auth/callback")));
    }

    #[test]
    fn app_urls_cover_tauri_protocol_on_every_platform() {
        assert!(is_app_url(&url("tauri://localhost/index.html#/items")));
        assert!(is_app_url(&url("http://tauri.localhost/index.html")));
        assert!(is_app_url(&url("https://tauri.localhost/")));
    }

    #[test]
    fn remote_sites_are_never_app_urls() {
        assert!(!is_app_url(&url("https://heapdeck.com/")));
        assert!(!is_app_url(&url("https://evil.example/tauri.localhost")));
        assert!(!is_app_url(&url("file:///tmp/index.html")));
    }

    #[test]
    fn dev_server_is_an_app_url_only_in_debug_builds() {
        assert_eq!(is_app_url(&url("http://localhost:5174/")), cfg!(debug_assertions));
        assert_eq!(is_app_url(&url("http://127.0.0.1:5174/")), cfg!(debug_assertions));
    }
}
