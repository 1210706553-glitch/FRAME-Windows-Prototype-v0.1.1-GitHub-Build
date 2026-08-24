import { describe, expect, it } from "vitest";
import type { ProjectPlan, UserPreferences } from "../types";
import { migrateStoredState, type StoredAppState } from "./state";

const preferences: UserPreferences = {
  displayName: "测试",
  dailyStartTime: "19:00",
  dailyMinutes: 150,
  restWeekday: -1,
  reminderEnabled: true,
  launchAtStartup: true,
  distractionApps: [],
  distractionSites: [],
};

const project: ProjectPlan = {
  id: "project",
  name: "测试项目",
  game: "测试素材",
  primaryPlatform: "B站",
  startDate: "2026-08-20",
  targetDate: "2026-09-01",
  createdAt: "2026-08-20T00:00:00.000Z",
  tasks: [{
    id: "task",
    title: "旧任务",
    stage: "素材梳理",
    estimateMinutes: 30,
    weight: 1,
    status: "todo",
    plannedDate: "2026-08-20",
    createdAt: "2026-08-20T00:00:00.000Z",
  }],
};

function stored(schemaVersion: number): StoredAppState {
  return {
    schemaVersion,
    project,
    preferences,
    focus: { status: "idle" },
    records: [{ date: "2026-08-20", focusedMinutes: 20, completedTaskIds: [] }],
  };
}

describe("migrateStoredState", () => {
  it("keeps v3 project data while upgrading to schema v4", () => {
    const result = migrateStoredState(stored(3), preferences, "2026-08-24");
    expect(result?.schemaVersion).toBe(4);
    expect(result?.project?.tasks[0].plannedDate).toBe("2026-08-20");
    expect(result?.records[0].focusedMinutes).toBe(20);
  });

  it("reflows pending v2 tasks without discarding the project", () => {
    const legacy = stored(2);
    legacy.project = legacy.project ? {
      ...legacy.project,
      tasks: legacy.project.tasks.map((task) => ({ ...task, plannedDate: "2026-08-25" })),
    } : null;
    const result = migrateStoredState(legacy, preferences, "2026-08-24");
    expect(result?.schemaVersion).toBe(4);
    expect(result?.project?.name).toBe("测试项目");
    expect(result?.project?.tasks[0].plannedDate).toBe("2026-08-24");
  });

  it("rejects unknown schemas", () => {
    expect(migrateStoredState(stored(99), preferences, "2026-08-24")).toBeNull();
  });
});
