import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export interface ReminderRuntimeStatus {
  native: boolean;
  permissionGranted: boolean;
  launchAtStartup: boolean;
}

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (await isPermissionGranted()) return true;
  return (await requestPermission()) === "granted";
}

export async function configureReminderRuntime(enabled: boolean, launchAtStartup: boolean): Promise<ReminderRuntimeStatus> {
  if (!isTauriRuntime()) {
    return { native: false, permissionGranted: false, launchAtStartup: false };
  }

  let startupEnabled = await isEnabled();
  if (enabled && launchAtStartup && !startupEnabled) {
    await enable();
    startupEnabled = true;
  } else if ((!enabled || !launchAtStartup) && startupEnabled) {
    await disable();
    startupEnabled = false;
  }

  const permissionGranted = enabled ? await ensureNotificationPermission() : await isPermissionGranted();
  return { native: true, permissionGranted, launchAtStartup: startupEnabled };
}

export async function sendNativeReminder(title: string, body: string): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  if (!(await ensureNotificationPermission())) return false;
  sendNotification({ title, body });
  return true;
}
