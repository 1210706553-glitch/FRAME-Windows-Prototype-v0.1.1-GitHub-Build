use serde::Serialize;
use serde_json::Value;
use std::process::Command;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaProbe {
    duration: f64,
    width: Option<u64>,
    height: Option<u64>,
    fps: Option<f64>,
    size: Option<u64>,
    audio_tracks: usize,
    format_name: Option<String>,
}

fn parse_rate(value: &str) -> Option<f64> {
    let mut parts = value.split('/');
    let numerator = parts.next()?.parse::<f64>().ok()?;
    let denominator = parts.next().unwrap_or("1").parse::<f64>().ok()?;
    (denominator != 0.0).then_some(numerator / denominator)
}

#[tauri::command]
pub fn probe_media(path: String) -> Result<MediaProbe, String> {
    let output = Command::new("ffprobe")
        .args(["-v", "error", "-print_format", "json", "-show_format", "-show_streams", &path])
        .output()
        .map_err(|_| "没有找到 ffprobe。请安装 FFmpeg，或把 ffprobe.exe 放入软件的 resources/bin 目录。".to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let payload: Value = serde_json::from_slice(&output.stdout).map_err(|error| error.to_string())?;
    let streams = payload["streams"].as_array().cloned().unwrap_or_default();
    let video = streams.iter().find(|stream| stream["codec_type"] == "video");
    let audio_tracks = streams.iter().filter(|stream| stream["codec_type"] == "audio").count();
    let format = &payload["format"];
    Ok(MediaProbe {
        duration: format["duration"].as_str().and_then(|value| value.parse().ok()).unwrap_or(0.0),
        width: video.and_then(|value| value["width"].as_u64()),
        height: video.and_then(|value| value["height"].as_u64()),
        fps: video.and_then(|value| value["avg_frame_rate"].as_str()).and_then(parse_rate),
        size: format["size"].as_str().and_then(|value| value.parse().ok()),
        audio_tracks,
        format_name: format["format_name"].as_str().map(str::to_string),
    })
}
