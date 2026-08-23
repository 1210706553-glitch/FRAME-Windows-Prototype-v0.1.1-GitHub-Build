use serde::Deserialize;
use std::fs;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportMarker { pub start: f64, pub end: f64, pub name: String, pub comment: String }

fn escape_xml(value: &str) -> String {
    value.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}

#[tauri::command]
pub fn export_premiere_xml(output_path: String, project_name: String, media_path: String, markers: Vec<ExportMarker>) -> Result<(), String> {
    let marker_xml = markers.iter().map(|marker| format!(
        "<marker><name>{}</name><comment>{}</comment><in>{}</in><out>{}</out></marker>",
        escape_xml(&marker.name), escape_xml(&marker.comment), (marker.start * 30.0).round() as i64, (marker.end * 30.0).round() as i64,
    )).collect::<String>();
    let xml = format!("<?xml version=\"1.0\" encoding=\"UTF-8\"?><xmeml version=\"5\"><project><name>{}</name><children><clip id=\"masterclip-1\"><name>{}</name><rate><timebase>30</timebase><ntsc>FALSE</ntsc></rate><file id=\"file-1\"><pathurl>file://localhost/{}</pathurl></file>{}</clip></children></project></xmeml>", escape_xml(&project_name), escape_xml(&project_name), escape_xml(&media_path.replace('\\', "/")), marker_xml);
    fs::write(output_path, xml).map_err(|error| error.to_string())
}
