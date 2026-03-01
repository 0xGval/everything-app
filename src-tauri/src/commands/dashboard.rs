use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Dashboard {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub sort_order: i32,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDashboardInput {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub sort_order: i32,
}

#[tauri::command]
pub async fn get_dashboards(pool: State<'_, SqlitePool>) -> Result<Vec<Dashboard>, String> {
    sqlx::query_as::<_, Dashboard>("SELECT * FROM dashboards ORDER BY sort_order")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_dashboard(
    pool: State<'_, SqlitePool>,
    input: CreateDashboardInput,
) -> Result<Dashboard, String> {
    sqlx::query(
        "INSERT INTO dashboards (id, name, icon, sort_order) VALUES (?, ?, ?, ?)",
    )
    .bind(&input.id)
    .bind(&input.name)
    .bind(&input.icon)
    .bind(input.sort_order)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Dashboard>("SELECT * FROM dashboards WHERE id = ?")
        .bind(&input.id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_dashboard(
    pool: State<'_, SqlitePool>,
    id: String,
    name: String,
    icon: String,
) -> Result<Dashboard, String> {
    sqlx::query("UPDATE dashboards SET name = ?, icon = ? WHERE id = ?")
        .bind(&name)
        .bind(&icon)
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Dashboard>("SELECT * FROM dashboards WHERE id = ?")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_dashboard(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
    // Delete associated widget instances first
    sqlx::query("DELETE FROM widget_instances WHERE dashboard_id = ?")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM dashboards WHERE id = ?")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
