import { invoke } from "@tauri-apps/api/core";

type NativeGuardSnapshot = [active: boolean, appCount: number, blockedAttempts: number, lastBlocked: string | null];
type NativeRunningApplication = [processName: string, windowTitle: string];

export interface RunningApplication {
  processName: string;
  windowTitle: string;
}

export interface AppGuardRuntimeStatus {
  native: boolean;
  active: boolean;
  appCount: number;
  blockedAttempts: number;
  lastBlocked?: string;
  error?: string;
}

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

function toRuntime(snapshot: NativeGuardSnapshot): AppGuardRuntimeStatus {
  return {
    native: true,
    active: snapshot[0],
    appCount: snapshot[1],
    blockedAttempts: snapshot[2],
    lastBlocked: snapshot[3] ?? undefined,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function syncNativeAppGuard(active: boolean, apps: string[], resumeAfterSeconds?: number): Promise<AppGuardRuntimeStatus> {
  if (!isTauriRuntime()) {
    return { native: false, active: false, appCount: apps.length, blockedAttempts: 0 };
  }
  try {
    const command = active ? "start_app_guard" : "stop_app_guard";
    const snapshot = active
      ? await invoke<NativeGuardSnapshot>(command, { apps })
      : await invoke<NativeGuardSnapshot>(command, { resumeAfterSeconds });
    return toRuntime(snapshot);
  } catch (error) {
    return { native: true, active: false, appCount: apps.length, blockedAttempts: 0, error: errorMessage(error) };
  }
}

export async function readNativeAppGuard(appCount: number): Promise<AppGuardRuntimeStatus> {
  if (!isTauriRuntime()) {
    return { native: false, active: false, appCount, blockedAttempts: 0 };
  }
  try {
    return toRuntime(await invoke<NativeGuardSnapshot>("app_guard_status"));
  } catch (error) {
    return { native: true, active: false, appCount, blockedAttempts: 0, error: errorMessage(error) };
  }
}

export async function listRunningApplications(): Promise<RunningApplication[]> {
  if (!isTauriRuntime()) {
    throw new Error("请在 Windows 桌面版中选择正在运行的软件");
  }
  try {
    const applications = await invoke<NativeRunningApplication[]>("list_running_apps");
    return applications.map(([processName, windowTitle]) => ({ processName, windowTitle }));
  } catch (error) {
    throw new Error(errorMessage(error));
  }
}
