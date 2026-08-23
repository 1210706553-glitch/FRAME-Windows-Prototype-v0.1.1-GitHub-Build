import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { MediaProbe, Project } from "../types";

export function runningInDesktop(): boolean {
  return isTauri();
}

export async function chooseVideo(): Promise<string | null> {
  if (!runningInDesktop()) return null;
  const selected = await open({
    multiple: false,
    directory: false,
    title: "导入视频素材",
    filters: [{ name: "视频", extensions: ["mp4", "mov", "mkv", "avi", "webm", "m4v"] }],
  });
  return typeof selected === "string" ? selected : null;
}

export async function chooseXmlDestination(defaultPath: string): Promise<string | null> {
  if (!runningInDesktop()) return null;
  const selected = await save({
    title: "导出 Premiere XML",
    defaultPath,
    filters: [{ name: "Premiere Pro XML", extensions: ["xml"] }],
  });
  return selected ?? null;
}

export function desktopMediaUrl(path: string): string {
  return runningInDesktop() ? convertFileSrc(path) : path;
}

export async function probeMedia(path: string): Promise<MediaProbe> {
  return invoke<MediaProbe>("probe_media", { path });
}

export async function initialiseDatabase(): Promise<void> {
  if (runningInDesktop()) await invoke("initialise_database");
}

export async function saveProject(project: Project): Promise<void> {
  if (runningInDesktop()) await invoke("save_project", { project });
}

export async function saveApiKey(provider: string, apiKey: string): Promise<void> {
  if (runningInDesktop()) await invoke("save_api_key", { provider, apiKey });
}

export async function apiKeyExists(provider: string): Promise<boolean> {
  if (!runningInDesktop()) return false;
  return invoke<boolean>("api_key_exists", { provider });
}

export async function transcriptionCapabilities(): Promise<{ ffmpeg: boolean; ffprobe: boolean; runner: boolean; models: string[] }> {
  if (!runningInDesktop()) return { ffmpeg: false, ffprobe: false, runner: false, models: [] };
  return invoke("transcription_capabilities");
}

export async function exportPremiereXml(outputPath: string, projectName: string, mediaPath: string, markers: Array<{ start: number; end: number; name: string; comment: string }>): Promise<void> {
  if (runningInDesktop()) await invoke("export_premiere_xml", { outputPath, projectName, mediaPath, markers });
}
