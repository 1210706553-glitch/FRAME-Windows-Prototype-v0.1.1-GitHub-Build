import { CREATION_STAGES, type CreationStage, type CreationTask } from "../types";

type TaskTemplate = { title: string; note: string; minutes: number; weight: number };

const templates: Record<CreationStage, TaskTemplate[]> = {
  素材梳理: [
    { title: "确认素材完整并建立项目目录", note: "只确认文件和音轨，不播放整片。", minutes: 25, weight: 1 },
    { title: "梳理完整事件因果链", note: "写清原因、行动、阻碍、结果和下一步。", minutes: 50, weight: 2 },
    { title: "记录笑点、信息点和转折", note: "先做清单，不在这里精剪。", minutes: 45, weight: 2 },
    { title: "确定素材保留与删除原则", note: "避免后面反复重新看素材。", minutes: 30, weight: 1 },
  ],
  粗剪: [
    { title: "搭建3～5秒倒叙钩子", note: "只保留一个最强事件。", minutes: 35, weight: 1 },
    { title: "完成前半段因果粗剪", note: "先保证能看懂，再压缩操作。", minutes: 75, weight: 3 },
    { title: "完成后半段因果粗剪", note: "笑点兑现后及时离开。", minutes: 75, weight: 3 },
    { title: "整片检查人物瞬移和半句话", note: "只修叙事断点，不做包装。", minutes: 40, weight: 2 },
  ],
  大纲: [
    { title: "写一句话观众入口", note: "让没玩过游戏的人也能理解。", minutes: 25, weight: 1 },
    { title: "确认目标、阻碍和结果", note: "每一段都回答为什么去下一处。", minutes: 35, weight: 2 },
    { title: "确定开头、升级和结尾闭环", note: "保留最重要的callback。", minutes: 45, weight: 2 },
  ],
  脚本与配音: [
    { title: "标出必须补旁白的位置", note: "只补画面无法说明的信息。", minutes: 30, weight: 1 },
    { title: "完成旁白与配音稿", note: "短句、口语化，不重复画面。", minutes: 60, weight: 2 },
    { title: "录制并同步配音", note: "先完成可用版本，再挑语气。", minutes: 60, weight: 2 },
  ],
  精剪与包装: [
    { title: "压缩停顿并完成节奏精剪", note: "保留必要反应，不剪成预告片。", minutes: 75, weight: 3 },
    { title: "完成字幕和必要音效", note: "包装服务于笑点，不盖住内容。", minutes: 60, weight: 2 },
    { title: "完成BGM、转场和画面包装", note: "用快慢和静音放大结果。", minutes: 60, weight: 2 },
  ],
  标题封面与发布: [
    { title: "确定标题与封面方向", note: "先给路人点击理由，再写游戏名。", minutes: 40, weight: 2 },
    { title: "导出并做上传前检查", note: "检查画质、响度、字幕和首尾。", minutes: 35, weight: 2 },
    { title: "发布并记录初始数据", note: "保存标题、封面和发布时间。", minutes: 20, weight: 1 },
  ],
  数据复盘: [
    { title: "记录24小时核心数据", note: "播放、点击、前一分钟和平均观看。", minutes: 20, weight: 1 },
    { title: "写下下期只改的一件事", note: "避免一次复盘十个问题。", minutes: 25, weight: 1 },
  ],
};

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function addDays(value: string, amount: number): string {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

export function isRestDay(value: string, restWeekday: number): boolean {
  return parseDateKey(value).getDay() === restWeekday;
}

export function nextWorkDate(value: string, restWeekday: number): string {
  let candidate = addDays(value, 1);
  while (isRestDay(candidate, restWeekday)) candidate = addDays(candidate, 1);
  return candidate;
}

export function scheduleTasks(tasks: CreationTask[], startDate: string, dailyMinutes: number, restWeekday: number): CreationTask[] {
  let cursor = isRestDay(startDate, restWeekday) ? nextWorkDate(startDate, restWeekday) : startDate;
  let index = 0;
  const scheduled: CreationTask[] = [];

  while (index < tasks.length) {
    const day: CreationTask[] = [];
    let used = 0;
    while (index < tasks.length && day.length < 5) {
      const task = tasks[index];
      const fits = used + task.estimateMinutes <= dailyMinutes;
      if (day.length >= 2 && !fits) break;
      day.push({ ...task, plannedDate: cursor });
      used += task.estimateMinutes;
      index += 1;
    }
    scheduled.push(...day);
    cursor = nextWorkDate(cursor, restWeekday);
  }
  return scheduled;
}

export function createTemplateTasks(startDate: string, dailyMinutes: number, restWeekday: number, seed = Date.now()): CreationTask[] {
  const createdAt = new Date(seed).toISOString();
  const tasks = CREATION_STAGES.flatMap((stage, stageIndex) => templates[stage].map((item, taskIndex) => ({
    id: `task-${seed}-${stageIndex}-${taskIndex}`,
    title: item.title,
    note: item.note,
    stage,
    estimateMinutes: item.minutes,
    weight: item.weight,
    status: "todo" as const,
    plannedDate: startDate,
    createdAt,
  })));
  return scheduleTasks(tasks, startDate, dailyMinutes, restWeekday);
}

export function completionPercent(tasks: CreationTask[]): number {
  const total = tasks.reduce((sum, task) => sum + task.weight, 0);
  if (!total) return 0;
  const done = tasks.filter((task) => task.status === "done").reduce((sum, task) => sum + task.weight, 0);
  return Math.round((done / total) * 100);
}

export function remainingMinutes(tasks: CreationTask[]): number {
  return tasks.filter((task) => task.status !== "done").reduce((sum, task) => sum + task.estimateMinutes, 0);
}

export function replanIncompleteTasks(tasks: CreationTask[], fromDate: string, restWeekday: number, dailyMinutes: number): CreationTask[] {
  const fixed = tasks.filter((task) => task.status === "done" || task.plannedDate < fromDate);
  const movable = tasks
    .filter((task) => task.status !== "done" && task.plannedDate >= fromDate)
    .map((task) => ({ ...task, status: task.status === "doing" ? "todo" as const : task.status }));
  return [...fixed, ...scheduleTasks(movable, nextWorkDate(fromDate, restWeekday), dailyMinutes, restWeekday)];
}

export function daysUntil(targetDate: string, now = new Date()): number {
  const target = parseDateKey(targetDate).getTime();
  const today = parseDateKey(localDateKey(now)).getTime();
  return Math.ceil((target - today) / 86_400_000);
}
