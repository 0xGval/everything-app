use serde::Serialize;
use sqlx::SqlitePool;
use tauri::Emitter;

#[derive(Debug, Serialize)]
pub struct TranscriptionResult {
    pub text: String,
}

fn punctuation_prompt(lang: &str) -> &str {
    match lang {
        "it" => "Ciao, come stai? Bene, grazie. Oggi il tempo è bello.",
        "en" => "Hello, how are you? I'm doing well, thanks. The weather is nice today.",
        "es" => "Hola, ¿cómo estás? Bien, gracias. Hoy hace buen tiempo.",
        "fr" => "Bonjour, comment allez-vous? Bien, merci. Il fait beau aujourd'hui.",
        "de" => "Hallo, wie geht es Ihnen? Gut, danke. Das Wetter ist heute schön.",
        _ => "Hello, how are you? I'm doing well, thanks.",
    }
}

#[tauri::command]
pub async fn save_groq_api_key(
    pool: tauri::State<'_, SqlitePool>,
    api_key: String,
) -> Result<(), String> {
    sqlx::query("INSERT INTO app_settings (key, value) VALUES ('groq_api_key', ?1) ON CONFLICT(key) DO UPDATE SET value = ?1")
        .bind(&api_key)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Failed to save API key: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_groq_api_key(
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Option<String>, String> {
    let row: Option<(String,)> =
        sqlx::query_as("SELECT value FROM app_settings WHERE key = 'groq_api_key'")
            .fetch_optional(pool.inner())
            .await
            .map_err(|e| format!("Failed to read API key: {}", e))?;

    Ok(row.map(|(v,)| v))
}

#[tauri::command]
pub async fn transcribe_audio(
    app: tauri::AppHandle,
    pool: tauri::State<'_, SqlitePool>,
    path: String,
    language: Option<String>,
) -> Result<TranscriptionResult, String> {
    // 1. Read API key
    let row: Option<(String,)> =
        sqlx::query_as("SELECT value FROM app_settings WHERE key = 'groq_api_key'")
            .fetch_optional(pool.inner())
            .await
            .map_err(|e| format!("Failed to read API key: {}", e))?;

    let api_key = row
        .map(|(v,)| v)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| "Groq API key not configured. Go to Settings to add it.".to_string())?;

    // 2. Emit started event
    let _ = app.emit("transcription:started", ());

    // 3. Read WAV file
    let file_bytes = std::fs::read(&path)
        .map_err(|e| format!("Recording file not found: {} ({})", path, e))?;

    // 4. Build multipart form
    let lang = language.as_deref().unwrap_or("en");
    let prompt = punctuation_prompt(lang);

    let file_name = std::path::Path::new(&path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let file_part = reqwest::multipart::Part::bytes(file_bytes)
        .file_name(file_name)
        .mime_str("audio/wav")
        .map_err(|e| format!("Failed to build file part: {}", e))?;

    let form = reqwest::multipart::Form::new()
        .part("file", file_part)
        .text("model", "whisper-large-v3")
        .text("language", lang.to_string())
        .text("prompt", prompt.to_string())
        .text("response_format", "json");

    // 5. POST to Groq
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.groq.com/openai/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Transcription failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        if status.as_u16() == 401 {
            return Err("Invalid Groq API key".to_string());
        }
        return Err(format!("Groq API error: {} {}", status, body));
    }

    // 6. Parse response
    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Groq response: {}", e))?;

    let text = json["text"]
        .as_str()
        .unwrap_or("")
        .to_string();

    // 7. Emit completed event
    let _ = app.emit("transcription:completed", &text);

    Ok(TranscriptionResult { text })
}
