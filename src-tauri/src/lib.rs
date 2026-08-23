mod media;
mod premiere;
mod secrets;
mod storage;
mod transcription;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            storage::initialise_database,
            storage::save_project,
            storage::list_projects,
            media::probe_media,
            secrets::save_api_key,
            secrets::api_key_exists,
            transcription::transcription_capabilities,
            premiere::export_premiere_xml,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FRAME / 文场");
}
