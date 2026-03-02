mod commands;
mod db;

use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri_plugin_autostart::MacosLauncher;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::dashboard::get_dashboards,
            commands::dashboard::create_dashboard,
            commands::dashboard::rename_dashboard,
            commands::dashboard::delete_dashboard,
            commands::widget::save_widget_instance,
            commands::widget::get_widget_instances,
            commands::widget::delete_widget_instance,
            commands::widget::save_widget_data,
            commands::widget::get_widget_data,
            commands::widget::delete_widget_data,
            commands::widget::log_event,
            commands::widget::get_events_log,
            commands::widget::update_widget_settings,
            commands::widget::get_widget_settings,
            commands::audio::list_audio_devices,
            commands::audio::start_recording,
            commands::audio::stop_recording,
            commands::audio::read_audio_base64,
            commands::audio::delete_recording_file,
            commands::transcription::transcribe_audio,
            commands::transcription::save_groq_api_key,
            commands::transcription::get_groq_api_key,
        ])
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");

            let pool = tauri::async_runtime::block_on(db::init(app_data_dir))
                .expect("database initialization failed");

            app.manage(pool);
            app.manage(commands::audio::RecordingState::default());

            // Build system tray menu
            let open_item = MenuItem::with_id(app, "open", "Open Everything App", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_item, &quit_item])?;

            // Build tray icon
            let icon = app.default_window_icon().cloned().expect("no default icon");
            TrayIconBuilder::new()
                .icon(icon)
                .tooltip("Everything App")
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "open" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // Intercept window close: hide to tray instead of quitting
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
            }

            println!("plugins registered, database ready, tray icon active");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
