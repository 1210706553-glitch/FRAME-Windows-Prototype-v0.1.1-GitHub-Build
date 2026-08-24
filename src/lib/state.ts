import type { AppState, UserPreferences } from "../types";
import { reflowPendingTasks } from "./planner";

export type StoredAppState = Omit<AppState, "schemaVersion"> & { schemaVersion?: number };

export function migrateStoredState(
  parsed: StoredAppState | null,
  defaults: UserPreferences,
  today: string,
): AppState | null {
  if (!parsed || ![2, 3, 4].includes(parsed.schemaVersion ?? 0)) return null;
  const preferences = { ...defaults, ...parsed.preferences };
  const project = parsed.project && parsed.schemaVersion === 2
    ? {
        ...parsed.project,
        tasks: reflowPendingTasks(parsed.project.tasks, today, preferences.restWeekday, preferences.dailyMinutes),
      }
    : parsed.project;
  return { ...parsed, schemaVersion: 4, project, preferences };
}
