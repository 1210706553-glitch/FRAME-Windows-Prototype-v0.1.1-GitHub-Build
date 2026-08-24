import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

export const FALLBACK_APP_VERSION = "0.6.0";

export interface AvailableAppUpdate {
  currentVersion: string;
  version: string;
  date?: string;
  body?: string;
  nativeUpdate: Update;
}

export type AppUpdateCheckResult =
  | { kind: "unsupported"; currentVersion: string }
  | { kind: "latest"; currentVersion: string }
  | { kind: "available"; currentVersion: string; update: AvailableAppUpdate };

export interface DownloadProgress {
  downloadedBytes: number;
  totalBytes?: number;
  percent?: number;
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function calculateDownloadPercent(downloadedBytes: number, totalBytes?: number): number | undefined {
  if (!totalBytes || totalBytes <= 0) return undefined;
  return Math.min(100, Math.max(0, Math.round((downloadedBytes / totalBytes) * 100)));
}

export function toUpdateErrorMessage(error: unknown): string {
  const raw = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (raw.includes("signature") || raw.includes("key") || raw.includes("verify")) {
    return "更新包签名验证失败，已停止安装。请稍后重试或联系发布者。";
  }
  if (raw.includes("404") || raw.includes("not found")) {
    return "暂时没有找到可用的正式更新包。";
  }
  if (raw.includes("timeout") || raw.includes("timed out")) {
    return "检查更新超时，请确认网络后重试。";
  }
  if (raw.includes("network") || raw.includes("connect") || raw.includes("dns") || raw.includes("request")) {
    return "暂时无法连接更新服务器，请确认网络后重试。";
  }
  return "更新没有完成，当前版本未被修改，可以稍后重试。";
}

export async function readCurrentAppVersion(): Promise<string> {
  if (!isTauriRuntime()) return FALLBACK_APP_VERSION;
  try {
    return await getVersion();
  } catch {
    return FALLBACK_APP_VERSION;
  }
}

export async function checkForAppUpdate(): Promise<AppUpdateCheckResult> {
  const currentVersion = await readCurrentAppVersion();
  if (!isTauriRuntime()) return { kind: "unsupported", currentVersion };

  const nativeUpdate = await check({ timeout: 12_000 });
  if (!nativeUpdate) return { kind: "latest", currentVersion };
  return {
    kind: "available",
    currentVersion,
    update: {
      currentVersion: nativeUpdate.currentVersion,
      version: nativeUpdate.version,
      date: nativeUpdate.date,
      body: nativeUpdate.body,
      nativeUpdate,
    },
  };
}

export async function downloadInstallAndRestart(
  update: AvailableAppUpdate,
  onProgress: (progress: DownloadProgress) => void,
): Promise<void> {
  let downloadedBytes = 0;
  let totalBytes: number | undefined;
  await update.nativeUpdate.downloadAndInstall((event) => {
    if (event.event === "Started") {
      totalBytes = event.data.contentLength;
      onProgress({ downloadedBytes: 0, totalBytes, percent: calculateDownloadPercent(0, totalBytes) });
      return;
    }
    if (event.event === "Progress") {
      downloadedBytes += event.data.chunkLength;
      onProgress({
        downloadedBytes,
        totalBytes,
        percent: calculateDownloadPercent(downloadedBytes, totalBytes),
      });
      return;
    }
    onProgress({ downloadedBytes: totalBytes ?? downloadedBytes, totalBytes, percent: totalBytes ? 100 : undefined });
  });
  await relaunch();
}
