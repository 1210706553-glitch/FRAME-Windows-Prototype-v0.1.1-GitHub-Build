export const CREATION_STAGES = [
  "素材梳理",
  "粗剪",
  "大纲",
  "脚本与配音",
  "精剪与包装",
  "标题封面与发布",
  "数据复盘",
] as const;

export type CreationStage = (typeof CREATION_STAGES)[number];
export type TaskStatus = "todo" | "doing" | "done";
export type FocusStatus = "idle" | "active" | "temporary-unlock";

export type AiPlanningStage = "素材梳理" | "粗剪" | "大纲";

export interface AiSuggestedTask {
  stage: AiPlanningStage;
  title: string;
  note: string;
  estimateMinutes: number;
}

export interface AiPlanningResult {
  materialOrganization: string;
  roughCutPlan: string;
  videoOutline: string;
  tasks: AiSuggestedTask[];
}

export interface ProjectAnalysis {
  sourceFileName: string;
  transcriptText: string;
  result: AiPlanningResult;
  analyzedAt: string;
}

export interface CreationTask {
  id: string;
  title: string;
  note?: string;
  stage: CreationStage;
  estimateMinutes: number;
  weight: number;
  status: TaskStatus;
  plannedDate: string;
  createdAt: string;
  completedAt?: string;
}

export interface ProjectPlan {
  id: string;
  name: string;
  game: string;
  primaryPlatform: "B站" | "抖音" | "小红书" | "快手" | "其他";
  secondaryPlatform?: string;
  startDate: string;
  targetDate: string;
  createdAt: string;
  tasks: CreationTask[];
  analysis?: ProjectAnalysis;
}

export interface UserPreferences {
  displayName: string;
  dailyStartTime: string;
  dailyMinutes: number;
  restWeekday: number;
  reminderEnabled: boolean;
  launchAtStartup: boolean;
  distractionApps: string[];
  distractionSites: string[];
}

export interface FocusSession {
  status: FocusStatus;
  taskId?: string;
  startedAt?: string;
  durationMinutes?: number;
  unlockUntil?: string;
  unlockReason?: string;
}

export interface DailyRecord {
  date: string;
  focusedMinutes: number;
  completedTaskIds: string[];
  unavailableReason?: string;
  usedDynamicRestDay?: boolean;
  absence?: boolean;
}

export interface AppState {
  schemaVersion: 4;
  project: ProjectPlan | null;
  preferences: UserPreferences;
  focus: FocusSession;
  records: DailyRecord[];
}

export type AppView = "today" | "plan" | "focus" | "review";
