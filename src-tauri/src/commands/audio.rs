use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::Serialize;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct AudioDevice {
    pub name: String,
    pub is_default: bool,
}

#[derive(Debug, Serialize)]
pub struct RecordingResult {
    pub path: String,
    pub duration_seconds: f64,
}

struct ActiveRecording {
    is_recording: Arc<AtomicBool>,
    thread_handle: Option<std::thread::JoinHandle<()>>,
    file_path: String,
    started_at: Instant,
}

pub struct RecordingState(Mutex<Option<ActiveRecording>>);

impl Default for RecordingState {
    fn default() -> Self {
        Self(Mutex::new(None))
    }
}

#[tauri::command]
#[allow(deprecated)]
pub async fn list_audio_devices() -> Result<Vec<AudioDevice>, String> {
    let host = cpal::default_host();

    let default_device_name = host
        .default_input_device()
        .and_then(|d| d.name().ok());

    let devices = host
        .input_devices()
        .map_err(|e| format!("Failed to enumerate input devices: {}", e))?;

    let mut result = Vec::new();
    for device in devices {
        if let Ok(name) = device.name() {
            let is_default = default_device_name
                .as_ref()
                .map(|d| d == &name)
                .unwrap_or(false);
            result.push(AudioDevice { name, is_default });
        }
    }

    Ok(result)
}

#[tauri::command]
pub async fn start_recording(
    app: tauri::AppHandle,
    state: tauri::State<'_, RecordingState>,
) -> Result<String, String> {
    let mut guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    if guard.is_some() {
        return Err("Recording already in progress".into());
    }

    // Resolve output path
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    let recordings_dir = app_data_dir.join("recordings");
    std::fs::create_dir_all(&recordings_dir)
        .map_err(|e| format!("Failed to create recordings dir: {}", e))?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let filename = format!("recording_{}.wav", timestamp);
    let file_path = recordings_dir.join(&filename);
    let file_path_str = file_path.to_string_lossy().to_string();

    // Get default input device and config
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or("No default input device found")?;

    let config = device
        .default_input_config()
        .map_err(|e| format!("Failed to get default input config: {}", e))?;

    let sample_rate = config.sample_rate();
    let channels = config.channels();
    let sample_format = config.sample_format();

    // Create WAV writer with 16-bit PCM spec matching device
    let wav_spec = hound::WavSpec {
        channels,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let writer = hound::WavWriter::create(&file_path, wav_spec)
        .map_err(|e| format!("Failed to create WAV writer: {}", e))?;

    let writer = Arc::new(Mutex::new(Some(writer)));
    let is_recording = Arc::new(AtomicBool::new(true));

    let is_recording_clone = is_recording.clone();
    let writer_clone = writer.clone();

    let thread_handle = std::thread::spawn(move || {
        let writer_for_callback = writer_clone.clone();

        let err_fn = |err: cpal::StreamError| {
            eprintln!("Audio stream error: {}", err);
        };

        let stream = match sample_format {
            cpal::SampleFormat::F32 => {
                device.build_input_stream(
                    &config.into(),
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        const MIC_GAIN: f32 = 3.0;
                        if let Ok(mut guard) = writer_for_callback.lock() {
                            if let Some(ref mut w) = *guard {
                                for &sample in data {
                                    let amplified = (sample * MIC_GAIN).clamp(-1.0, 1.0);
                                    let int_sample = (amplified * i16::MAX as f32) as i16;
                                    let _ = w.write_sample(int_sample);
                                }
                            }
                        }
                    },
                    err_fn,
                    None,
                )
            }
            cpal::SampleFormat::I16 => {
                device.build_input_stream(
                    &config.into(),
                    move |data: &[i16], _: &cpal::InputCallbackInfo| {
                        if let Ok(mut guard) = writer_for_callback.lock() {
                            if let Some(ref mut w) = *guard {
                                for &sample in data {
                                    let _ = w.write_sample(sample);
                                }
                            }
                        }
                    },
                    err_fn,
                    None,
                )
            }
            _ => {
                eprintln!("Unsupported sample format: {:?}", sample_format);
                return;
            }
        };

        let stream = match stream {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Failed to build input stream: {}", e);
                return;
            }
        };

        if let Err(e) = stream.play() {
            eprintln!("Failed to start stream: {}", e);
            return;
        }

        // Keep the thread alive while recording
        while is_recording_clone.load(Ordering::Relaxed) {
            std::thread::sleep(std::time::Duration::from_millis(100));
        }

        // Drop stream first to stop receiving samples
        drop(stream);

        // Finalize WAV file
        if let Ok(mut guard) = writer_clone.lock() {
            if let Some(w) = guard.take() {
                if let Err(e) = w.finalize() {
                    eprintln!("Failed to finalize WAV: {}", e);
                }
            }
        }
    });

    *guard = Some(ActiveRecording {
        is_recording,
        thread_handle: Some(thread_handle),
        file_path: file_path_str.clone(),
        started_at: Instant::now(),
    });

    Ok(file_path_str)
}

#[tauri::command]
pub async fn read_audio_base64(path: String) -> Result<String, String> {
    use base64::Engine;
    let bytes =
        std::fs::read(&path).map_err(|e| format!("Failed to read audio file: {}", e))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}

#[tauri::command]
pub async fn delete_recording_file(path: String) -> Result<(), String> {
    let file = std::path::Path::new(&path);
    if file.exists() {
        std::fs::remove_file(file)
            .map_err(|e| format!("Failed to delete recording file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn stop_recording(
    state: tauri::State<'_, RecordingState>,
) -> Result<RecordingResult, String> {
    let mut guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    let recording = guard
        .take()
        .ok_or("No recording in progress")?;

    // Signal the thread to stop
    recording.is_recording.store(false, Ordering::Relaxed);

    // Wait for the thread to finish (with timeout)
    if let Some(handle) = recording.thread_handle {
        let _ = handle.join();
    }

    let duration_seconds = recording.started_at.elapsed().as_secs_f64();

    Ok(RecordingResult {
        path: recording.file_path,
        duration_seconds,
    })
}
