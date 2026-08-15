use std::path::Path;
use std::sync::Mutex;

use tauri::{Manager, RunEvent};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use url::Url;

const READY_PREFIX: &str = "dsh web: ";

struct RuntimeProcess(Mutex<Option<CommandChild>>);

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(RuntimeProcess(Mutex::new(None)))
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(error) = start_runtime(app_handle.clone()).await {
                    eprintln!("dsh desktop: {error}");
                    show_startup_failure(&app_handle);
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build DeepSeek Harness desktop application");

    app.run(|app_handle, event| {
        if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
            stop_runtime(app_handle);
        }
    });
}

async fn start_runtime(app: tauri::AppHandle) -> Result<(), String> {
    let resource_dir = app.path().resource_dir().map_err(|error| error.to_string())?;
    let entry = resource_dir.join("runtime").join("lib").join("bin.js");
    ensure_runtime_entry(&entry)?;

    let dsh_home = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("dsh");
    std::fs::create_dir_all(&dsh_home).map_err(|error| error.to_string())?;

    let command = app
        .shell()
        .sidecar("dsh-node")
        .map_err(|error| error.to_string())?
        .args([entry.as_os_str(), "web".as_ref(), "--port".as_ref(), "0".as_ref()])
        .env("DSH_HOME", dsh_home)
        .env("DSH_DESKTOP", "1");
    let (mut events, child) = command.spawn().map_err(|error| error.to_string())?;
    *app.state::<RuntimeProcess>().0.lock().map_err(|_| "runtime process lock poisoned")? = Some(child);

    let mut stdout = String::new();
    while let Some(event) = events.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                stdout.push_str(&String::from_utf8_lossy(&bytes));
                if let Some(url) = extract_ready_url(&stdout) {
                    navigate_to_runtime(&app, url)?;
                    return Ok(());
                }
                retain_unfinished_line(&mut stdout);
            }
            CommandEvent::Stderr(bytes) => eprint!("{}", String::from_utf8_lossy(&bytes)),
            CommandEvent::Error(error) => return Err(error),
            CommandEvent::Terminated(payload) => {
                return Err(format!("runtime exited before readiness: {payload:?}"));
            }
            _ => {}
        }
    }
    Err("runtime event stream closed before readiness".into())
}

fn ensure_runtime_entry(entry: &Path) -> Result<(), String> {
    if entry.is_file() {
        Ok(())
    } else {
        Err(format!("bundled dsh entry is missing: {}", entry.display()))
    }
}

fn extract_ready_url(output: &str) -> Option<Url> {
    output.lines().find_map(|line| {
        let candidate = line.strip_prefix(READY_PREFIX)?.split_whitespace().next()?;
        let url = Url::parse(candidate).ok()?;
        (url.scheme() == "http" && url.host_str() == Some("127.0.0.1")).then_some(url)
    })
}

fn retain_unfinished_line(output: &mut String) {
    if let Some(index) = output.rfind('\n') {
        output.drain(..=index);
    }
}

fn navigate_to_runtime(app: &tauri::AppHandle, url: Url) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window is unavailable".to_string())?;
    window
        .navigate(runtime_url(url, cfg!(debug_assertions)))
        .map_err(|error| error.to_string())
}

fn runtime_url(mut url: Url, debug_binary: bool) -> Url {
    if debug_binary {
        url.query_pairs_mut().append_pair("dshDesktopDebug", "1");
    }
    url
}

fn show_startup_failure(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_title("DeepSeek Harness — startup failed");
        let _ = window.eval(
            "document.querySelector('p').textContent = 'DeepSeek Harness could not start. Check the application logs.'; document.querySelector('.mark').style.animation = 'none';",
        );
    }
}

fn stop_runtime(app: &tauri::AppHandle) {
    let state = app.state::<RuntimeProcess>();
    if let Ok(mut slot) = state.0.lock() {
        if let Some(child) = slot.take() {
            let _ = child.kill();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_loopback_readiness_url() {
        let url = extract_ready_url("noise\ndsh web: http://127.0.0.1:49152\n").unwrap();
        assert_eq!(url.as_str(), "http://127.0.0.1:49152/");
    }

    #[test]
    fn rejects_non_loopback_readiness_url() {
        assert!(extract_ready_url("dsh web: http://example.com:49152\n").is_none());
    }

    #[test]
    fn retains_only_incomplete_stdout_line() {
        let mut output = "complete\ndsh web: http://127.0".to_string();
        retain_unfinished_line(&mut output);
        assert_eq!(output, "dsh web: http://127.0");
    }

    #[test]
    fn marks_debug_runtime_url() {
        let url = Url::parse("http://127.0.0.1:49152/").unwrap();
        assert_eq!(runtime_url(url, true).query(), Some("dshDesktopDebug=1"));
    }
}
