use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInput {
    pub id: String,
    pub name: String,
    pub game: String,
    pub stage: String,
    pub updated_at: String,
    pub media_count: i64,
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("frame.db"))
}

fn open_database(app: &AppHandle) -> Result<Connection, String> {
    Connection::open(database_path(app)?).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn initialise_database(app: AppHandle) -> Result<(), String> {
    let connection = open_database(&app)?;
    connection.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         CREATE TABLE IF NOT EXISTS projects (
           id TEXT PRIMARY KEY,
           name TEXT NOT NULL,
           game TEXT NOT NULL DEFAULT '',
           stage TEXT NOT NULL,
           updated_at TEXT NOT NULL,
           media_count INTEGER NOT NULL DEFAULT 0
         );
         CREATE TABLE IF NOT EXISTS media_items (
           id TEXT PRIMARY KEY,
           project_id TEXT NOT NULL,
           name TEXT NOT NULL,
           path TEXT NOT NULL,
           duration REAL NOT NULL DEFAULT 0,
           width INTEGER,
           height INTEGER,
           fps REAL,
           status TEXT NOT NULL DEFAULT 'ready',
           FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
         );
         CREATE TABLE IF NOT EXISTS material_nodes (
           id TEXT PRIMARY KEY,
           media_id TEXT NOT NULL,
           start_seconds REAL NOT NULL,
           end_seconds REAL NOT NULL,
           text TEXT NOT NULL,
           kind TEXT NOT NULL,
           score INTEGER NOT NULL DEFAULT 0,
           source TEXT NOT NULL,
           FOREIGN KEY(media_id) REFERENCES media_items(id) ON DELETE CASCADE
         );
         CREATE TABLE IF NOT EXISTS app_settings (
           key TEXT PRIMARY KEY,
           value TEXT NOT NULL
         );",
    ).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn save_project(app: AppHandle, project: ProjectInput) -> Result<(), String> {
    let connection = open_database(&app)?;
    connection.execute(
        "INSERT INTO projects (id, name, game, stage, updated_at, media_count)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           game = excluded.game,
           stage = excluded.stage,
           updated_at = excluded.updated_at,
           media_count = excluded.media_count",
        params![project.id, project.name, project.game, project.stage, project.updated_at, project.media_count],
    ).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_projects(app: AppHandle) -> Result<Vec<ProjectInput>, String> {
    let connection = open_database(&app)?;
    let mut statement = connection.prepare(
        "SELECT id, name, game, stage, updated_at, media_count FROM projects ORDER BY rowid DESC",
    ).map_err(|error| error.to_string())?;
    let rows = statement.query_map([], |row| Ok(ProjectInput {
        id: row.get(0)?, name: row.get(1)?, game: row.get(2)?, stage: row.get(3)?, updated_at: row.get(4)?, media_count: row.get(5)?,
    })).map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}
