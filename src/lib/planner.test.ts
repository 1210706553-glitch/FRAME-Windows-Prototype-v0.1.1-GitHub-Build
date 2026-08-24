import { describe, expect, it } from "vitest";
import { completionPercent, createTemplateTasks, isRestDay, plannedFinishDate, reflowPendingTasks, replanIncompleteTasks } from "./planner";

describe("planner", () => {
  it("schedules two to five tasks per workday and skips the rest weekday", () => {
    const tasks = createTemplateTasks("2026-08-24", 150, 0, 1);
    const grouped = tasks.reduce((map, task) => {
      const day = map.get(task.plannedDate) ?? [];
      day.push(task);
      map.set(task.plannedDate, day);
      return map;
    }, new Map<string, typeof tasks>());
    for (const [date, dayTasks] of grouped) {
      expect(isRestDay(date, 0)).toBe(false);
      expect(dayTasks.length).toBeGreaterThanOrEqual(2);
      expect(dayTasks.length).toBeLessThanOrEqual(5);
    }
    expect(grouped.get("2026-08-24")).toHaveLength(4);
    expect(grouped.get("2026-08-24")?.reduce((sum, task) => sum + task.estimateMinutes, 0)).toBe(150);
  });

  it("uses task weights for project completion", () => {
    const tasks = createTemplateTasks("2026-08-24", 150, 0, 1);
    const total = tasks.reduce((sum, task) => sum + task.weight, 0);
    const firstWeight = tasks[0].weight;
    tasks[0] = { ...tasks[0], status: "done" };
    expect(completionPercent(tasks)).toBe(Math.round((firstWeight / total) * 100));
  });

  it("supports a dynamic rest day without skipping a fixed weekday", () => {
    const tasks = createTemplateTasks("2026-08-24", 150, -1, 1);
    expect(tasks.some((task) => task.plannedDate === "2026-08-30")).toBe(true);
    expect(tasks.every((task) => !isRestDay(task.plannedDate, -1))).toBe(true);
  });

  it("moves unfinished work to the next workday", () => {
    const tasks = createTemplateTasks("2026-08-24", 150, 0, 1);
    const replanned = replanIncompleteTasks(tasks, "2026-08-24", 0, 150);
    expect(replanned.filter((task) => task.status !== "done").every((task) => task.plannedDate > "2026-08-24")).toBe(true);
  });

  it("repairs a sparse current day by filling it from pending tasks", () => {
    const tasks = createTemplateTasks("2026-08-24", 150, -1, 1).map((task, index) => ({
      ...task,
      plannedDate: index === 0 ? "2026-08-24" : task.plannedDate < "2026-08-25" ? "2026-08-25" : task.plannedDate,
    }));
    const repaired = reflowPendingTasks(tasks, "2026-08-24", -1, 150);
    const today = repaired.filter((task) => task.plannedDate === "2026-08-24");
    expect(today).toHaveLength(4);
    expect(today.reduce((sum, task) => sum + task.estimateMinutes, 0)).toBe(150);
    expect(plannedFinishDate(repaired)).toBe("2026-08-31");
  });
});
