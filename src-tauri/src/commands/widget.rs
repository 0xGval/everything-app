use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct WidgetInstance {
    pub id: String,
    pub widget_type: String,
    pub dashboard_id: String,
    pub grid_position: String,
    pub settings: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveWidgetInstanceInput {
    pub id: String,
    pub widget_type: String,
    pub dashboard_id: String,
    pub grid_position: String,
    pub settings: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct WidgetData {
    pub id: String,
    pub widget_instance_id: String,
    pub key: String,
    pub value: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveWidgetDataInput {
    pub id: String,
    pub widget_instance_id: String,
    pub key: String,
    pub value: String,
}

#[tauri::command]
pub async fn save_widget_instance(
    pool: State<'_, SqlitePool>,
    input: SaveWidgetInstanceInput,
) -> Result<WidgetInstance, String> {
    sqlx::query(
        "INSERT INTO widget_instances (id, widget_type, dashboard_id, grid_position, settings)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            grid_position = excluded.grid_position,
            settings = excluded.settings,
            updated_at = datetime('now')",
    )
    .bind(&input.id)
    .bind(&input.widget_type)
    .bind(&input.dashboard_id)
    .bind(&input.grid_position)
    .bind(&input.settings)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, WidgetInstance>("SELECT * FROM widget_instances WHERE id = ?")
        .bind(&input.id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_widget_instances(
    pool: State<'_, SqlitePool>,
    dashboard_id: String,
) -> Result<Vec<WidgetInstance>, String> {
    sqlx::query_as::<_, WidgetInstance>(
        "SELECT * FROM widget_instances WHERE dashboard_id = ? ORDER BY created_at",
    )
    .bind(&dashboard_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_widget_data(
    pool: State<'_, SqlitePool>,
    input: SaveWidgetDataInput,
) -> Result<WidgetData, String> {
    sqlx::query(
        "INSERT INTO widget_data (id, widget_instance_id, key, value)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(widget_instance_id, key) DO UPDATE SET
            value = excluded.value,
            updated_at = datetime('now')",
    )
    .bind(&input.id)
    .bind(&input.widget_instance_id)
    .bind(&input.key)
    .bind(&input.value)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, WidgetData>(
        "SELECT * FROM widget_data WHERE widget_instance_id = ? AND key = ?",
    )
    .bind(&input.widget_instance_id)
    .bind(&input.key)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_widget_data(
    pool: State<'_, SqlitePool>,
    widget_instance_id: String,
) -> Result<Vec<WidgetData>, String> {
    sqlx::query_as::<_, WidgetData>(
        "SELECT * FROM widget_data WHERE widget_instance_id = ? ORDER BY key",
    )
    .bind(&widget_instance_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn log_event(
    pool: State<'_, SqlitePool>,
    event_name: String,
    payload: String,
    source_widget_id: Option<String>,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO events_log (event_name, payload, source_widget_id) VALUES (?, ?, ?)",
    )
    .bind(&event_name)
    .bind(&payload)
    .bind(&source_widget_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Debug, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct EventLogRow {
    pub id: i64,
    pub event_name: String,
    pub payload: String,
    pub source_widget_id: Option<String>,
    pub timestamp: String,
}

#[tauri::command]
pub async fn update_widget_settings(
    pool: State<'_, SqlitePool>,
    widget_instance_id: String,
    settings: String,
) -> Result<(), String> {
    sqlx::query(
        "UPDATE widget_instances SET settings = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(&settings)
    .bind(&widget_instance_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_widget_settings(
    pool: State<'_, SqlitePool>,
    widget_instance_id: String,
) -> Result<String, String> {
    let row: (String,) = sqlx::query_as(
        "SELECT settings FROM widget_instances WHERE id = ?",
    )
    .bind(&widget_instance_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(row.0)
}

#[tauri::command]
pub async fn get_events_log(
    pool: State<'_, SqlitePool>,
    limit: Option<i64>,
) -> Result<Vec<EventLogRow>, String> {
    let limit = limit.unwrap_or(50);
    sqlx::query_as::<_, EventLogRow>(
        "SELECT * FROM events_log ORDER BY id DESC LIMIT ?",
    )
    .bind(limit)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}
