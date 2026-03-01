pub mod migrations;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::path::PathBuf;
use std::str::FromStr;

pub async fn init(app_data_dir: PathBuf) -> Result<SqlitePool, Box<dyn std::error::Error>> {
    std::fs::create_dir_all(&app_data_dir)?;

    let db_path = app_data_dir.join("everythingapp.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let options = SqliteConnectOptions::from_str(&db_url)?
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    // Enable foreign keys
    sqlx::query("PRAGMA foreign_keys = ON;")
        .execute(&pool)
        .await?;

    migrations::run(&pool).await?;
    migrations::seed(&pool).await?;

    println!("database initialized at {}", db_path.display());

    Ok(pool)
}
