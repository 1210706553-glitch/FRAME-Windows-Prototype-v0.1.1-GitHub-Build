import { describe, expect, it } from "vitest";
import { evaluateReminder, type ReminderInput } from "./reminders";

function input(time: string, overrides: Partial<ReminderInput> = {}): ReminderInput {
  return {
    now: new Date(`2026-08-24T${time}:00`),
    dailyStartTime: "19:00",
    enabled: true,
    totalTasks: 4,
    doneTasks: 1,
    remainingMinutes: 120,
    focusStatus: "idle",
    unavailable: false,
    focusedMinutes: 0,
    sentKeys: [],
    ...overrides,
  };
}

describe("reminder engine", () => {
  it("does not remind before the configured start time", () => {
    expect(evaluateReminder(input("18:59"))).toBeNull();
  });

  it("uses start, grace and follow-up reminder windows", () => {
    expect(evaluateReminder(input("19:00"))?.key).toBe("2026-08-24:start");
    expect(evaluateReminder(input("19:16"))?.key).toBe("2026-08-24:not-started");
    expect(evaluateReminder(input("20:16"))?.key).toBe("2026-08-24:follow-up:1");
  });

  it("stays quiet while focusing, after completion or on an unavailable day", () => {
    expect(evaluateReminder(input("20:00", { focusStatus: "active" }))).toBeNull();
    expect(evaluateReminder(input("20:00", { doneTasks: 4 }))).toBeNull();
    expect(evaluateReminder(input("20:00", { unavailable: true }))).toBeNull();
  });

  it("does not repeat a reminder already sent in the same window", () => {
    expect(evaluateReminder(input("19:05", { sentKeys: ["2026-08-24:start"] }))).toBeNull();
  });
});
