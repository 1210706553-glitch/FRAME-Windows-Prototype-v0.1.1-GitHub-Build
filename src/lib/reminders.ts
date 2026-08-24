import type { FocusStatus } from "../types";
import { localDateKey } from "./planner";

export interface ReminderInput {
  now: Date;
  dailyStartTime: string;
  enabled: boolean;
  totalTasks: number;
  doneTasks: number;
  remainingMinutes: number;
  focusStatus: FocusStatus;
  unavailable: boolean;
  focusedMinutes: number;
  sentKeys: string[];
}

export interface ReminderDecision {
  key: string;
  title: string;
  body: string;
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseClock(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatRemaining(value: number): string {
  if (value < 60) return `${value}分钟`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours}小时${minutes}分` : `${hours}小时`;
}

export function evaluateReminder(input: ReminderInput): ReminderDecision | null {
  if (!input.enabled || input.totalTasks === 0 || input.doneTasks >= input.totalTasks) return null;
  if (input.focusStatus !== "idle" || input.unavailable) return null;

  const elapsed = minutesSinceMidnight(input.now) - parseClock(input.dailyStartTime);
  if (elapsed < 0) return null;

  const date = localDateKey(input.now);
  let key: string;
  let title: string;
  let body: string;

  if (elapsed < 15) {
    key = `${date}:start`;
    title = "到今天的视频制作时间了";
    body = `先打开第一项任务，只做最小的一步。今天还有${input.totalTasks - input.doneTasks}项。`;
  } else if (elapsed < 45 && input.focusedMinutes === 0) {
    key = `${date}:not-started`;
    title = "已经过去15分钟，还没开始";
    body = "不要先把整个项目想完。打开工具，点击“开始制作”即可。";
  } else {
    const slot = Math.max(0, Math.floor((elapsed - 45) / 30));
    key = `${date}:follow-up:${slot}`;
    title = input.focusedMinutes > 0 ? "回来继续推进这一小步" : "今天的视频任务还在等你";
    body = `还剩${input.totalTasks - input.doneTasks}项，预计${formatRemaining(input.remainingMinutes)}。先完成当前这一项。`;
  }

  return input.sentKeys.includes(key) ? null : { key, title, body };
}
