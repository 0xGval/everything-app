mod commands;
mod db;

use tauri::Manager;
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
            commands::widget::save_widget_instance,
            commands::widget::get_widget_instances,
            commands::widget::save_widget_data,
            commands::widget::get_widget_data,
            commands::widget::log_event,
            commands::widget::get_events_log,
            commands::widget::update_widget_settings,
            commands::widget::get_widget_settings,
        ])
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");

            let pool = tauri::async_runtime::block_on(db::init(app_data_dir))
                .expect("database initialization failed");

            app.manage(pool);
            println!("plugins registered, database ready");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
