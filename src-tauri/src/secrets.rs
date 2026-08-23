#[tauri::command]
pub fn save_api_key(provider: String, api_key: String) -> Result<(), String> {
    let entry = keyring::Entry::new("com.sunday.frame", &provider).map_err(|error| error.to_string())?;
    entry.set_password(&api_key).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn api_key_exists(provider: String) -> Result<bool, String> {
    let entry = keyring::Entry::new("com.sunday.frame", &provider).map_err(|error| error.to_string())?;
    match entry.get_password() {
        Ok(value) => Ok(!value.is_empty()),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(error) => Err(error.to_string()),
    }
}
