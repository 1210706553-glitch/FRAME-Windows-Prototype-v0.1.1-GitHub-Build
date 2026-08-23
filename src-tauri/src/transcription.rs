use serde::Serialize;
use std::fs;
use std::process::Command;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize)]
pub struct TranscriptionCapabilities {
    ffmpeg: bool,
    ffprobe: bool,
    runner: bool,
    models: Vec<String>,
}

fn command_available(name: &str) -> bool {
    Command::new(name).arg("-version").output().map(|output| output.status.success()).unwrap_or(false)
}

#[tauri::command]
pub fn transcription_capabilities(app: AppHandle) -> Result<TranscriptionCapabilities, String> {
    let resource_dir = app.path().resource_dir().map_err(|error| error.to_string())?;
    let runner = resource_dir.join("bin").join("frame-transcriber.exe").exists();
    let models_dir = app.path().app_data_dir().map_err(|error| error.to_string())?.join("models");
    let models = if models_dir.exists() {
        fs::read_dir(models_dir).map_err(|error| error.to_string())?.filter_map(|entry| entry.ok()).filter(|entry| entry.path().is_dir()).filter_map(|entry| entry.file_name().into_string().ok()).collect()
    } else { Vec::new() };
    Ok(TranscriptionCapabilities { ffmpeg: command_available("ffmpeg"), ffprobe: command_available("ffprobe"), runner, models })
}
