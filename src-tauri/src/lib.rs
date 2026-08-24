use std::{
    collections::HashSet,
    process::{Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

type GuardSnapshot = (bool, usize, u64, Option<String>);

#[derive(Default)]
struct AppGuardState {
    active: bool,
    blocked_apps: Vec<String>,
    blocked_attempts: u64,
    last_blocked: Option<String>,
    resume_at: Option<Instant>,
}

#[derive(Clone)]
struct AppGuard {
    inner: Arc<Mutex<AppGuardState>>,
}

impl AppGuard {
    fn new() -> Self {
        let guard = Self {
            inner: Arc::new(Mutex::new(AppGuardState::default())),
        };
        spawn_app_guard_monitor(guard.inner.clone());
        guard
    }

    fn snapshot(&self) -> GuardSnapshot {
        let state = self.inner.lock().unwrap_or_else(|error| error.into_inner());
        (
            state.active,
            state.blocked_apps.len(),
            state.blocked_attempts,
            state.last_blocked.clone(),
        )
    }
}

fn normalize_process_name(value: &str) -> Option<String> {
    let mut name = value.trim().to_ascii_lowercase();
    if name.is_empty()
        || name.chars().any(|character| matches!(character, '\\' | '/' | ':'))
        || !name
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | '-'))
    {
        return None;
    }
    if !name.ends_with(".exe") {
        name.push_str(".exe");
    }
    const PROTECTED: &[&str] = &[
        "mickey-toolkit.exe",
        "frame-video-workbench.exe",
        "explorer.exe",
        "smss.exe",
        "wininit.exe",
        "winlogon.exe",
        "csrss.exe",
        "lsass.exe",
        "services.exe",
        "svchost.exe",
        "dwm.exe",
        "userinit.exe",
        "conhost.exe",
        "fontdrvhost.exe",
        "sihost.exe",
        "shellexperiencehost.exe",
        "startmenuexperiencehost.exe",
        "taskmgr.exe",
        "cmd.exe",
        "powershell.exe",
        "pwsh.exe",
    ];
    (!PROTECTED.contains(&name.as_str())).then_some(name)
}

fn normalize_process_names(values: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    values
        .iter()
        .filter_map(|value| normalize_process_name(value))
        .filter(|value| seen.insert(value.clone()))
        .collect()
}

#[cfg(target_os = "windows")]
fn terminate_process(name: &str) -> bool {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    Command::new("taskkill.exe")
        .args(["/F", "/T", "/IM", name])
        .creation_flags(CREATE_NO_WINDOW)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

#[cfg(not(target_os = "windows"))]
fn terminate_process(_name: &str) -> bool {
    false
}

fn try_block_apps(inner: &Arc<Mutex<AppGuardState>>, apps: &[String]) {
    for app in apps {
        if !terminate_process(app) {
            continue;
        }
        let mut state = inner.lock().unwrap_or_else(|error| error.into_inner());
        if state.active && state.blocked_apps.contains(app) {
            state.blocked_attempts = state.blocked_attempts.saturating_add(1);
            state.last_blocked = Some(app.clone());
        }
    }
}

fn spawn_app_guard_monitor(inner: Arc<Mutex<AppGuardState>>) {
    thread::spawn(move || loop {
        let apps = {
            let mut state = inner.lock().unwrap_or_else(|error| error.into_inner());
            if !state.active && state.resume_at.is_some_and(|deadline| deadline <= Instant::now()) {
                state.active = true;
                state.resume_at = None;
            }
            if state.active {
                state.blocked_apps.clone()
            } else {
                Vec::new()
            }
        };
        if !apps.is_empty() {
            try_block_apps(&inner, &apps);
        }
        thread::sleep(Duration::from_secs(2));
    });
}

#[tauri::command]
fn start_app_guard(guard: State<'_, AppGuard>, apps: Vec<String>) -> Result<GuardSnapshot, String> {
    let apps = normalize_process_names(apps);
    if apps.is_empty() {
        return Err("No valid application process names are configured".to_string());
    }
    {
        let mut state = guard.inner.lock().unwrap_or_else(|error| error.into_inner());
        state.active = true;
        state.blocked_apps = apps.clone();
        state.resume_at = None;
    }
    try_block_apps(&guard.inner, &apps);
    Ok(guard.snapshot())
}

#[tauri::command]
fn stop_app_guard(guard: State<'_, AppGuard>, resume_after_seconds: Option<u64>) -> GuardSnapshot {
    let mut state = guard.inner.lock().unwrap_or_else(|error| error.into_inner());
    state.active = false;
    state.resume_at = resume_after_seconds
        .filter(|seconds| *seconds > 0)
        .map(|seconds| Instant::now() + Duration::from_secs(seconds));
    (
        state.active,
        state.blocked_apps.len(),
        state.blocked_attempts,
        state.last_blocked.clone(),
    )
}

#[tauri::command]
fn app_guard_status(guard: State<'_, AppGuard>) -> GuardSnapshot {
    guard.snapshot()
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppGuard::new())
        .invoke_handler(tauri::generate_handler![
            start_app_guard,
            stop_app_guard,
            app_guard_status
        ])
        .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .setup(|app| {
            let open_item = MenuItem::with_id(app, "open", "打开米奇妙妙工具", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "彻底退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_item, &quit_item])?;

            TrayIconBuilder::with_id("mickey-toolkit-tray")
                .icon(app.default_window_icon().expect("app icon missing").clone())
                .tooltip("张诗语の米奇妙妙工具 · 每日视频制作督促")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            if std::env::args().any(|argument| argument == "--hidden") {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Mickey Toolkit");
}

#[cfg(test)]
mod tests {
    use super::{normalize_process_name, normalize_process_names};

    #[test]
    fn normalizes_safe_process_names() {
        assert_eq!(normalize_process_name(" Steam "), Some("steam.exe".to_string()));
        assert_eq!(normalize_process_name("DOTA2.EXE"), Some("dota2.exe".to_string()));
    }

    #[test]
    fn rejects_paths_and_critical_processes() {
        assert_eq!(normalize_process_name("C:\\Windows\\explorer.exe"), None);
        assert_eq!(normalize_process_name("explorer.exe"), None);
        assert_eq!(normalize_process_name("mickey-toolkit.exe"), None);
        assert_eq!(normalize_process_name("game.exe & calc.exe"), None);
    }

    #[test]
    fn removes_duplicates() {
        assert_eq!(
            normalize_process_names(vec!["steam".into(), "STEAM.EXE".into(), "dota2".into()]),
            vec!["steam.exe".to_string(), "dota2.exe".to_string()]
        );
    }
}
