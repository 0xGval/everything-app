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
        .invoke_handler(tauri::generate_handler![greet])
        .setup(|_app| {
            println!("plugins registered");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
