import { useEffect, useState } from "react";
import {
  AlarmClock,
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Coffee,
  Focus,
  Gauge,
  ListChecks,
  LockKeyhole,
  Play,
  Power,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  X,
} from "lucide-react";
import "./App.css";
import {
  addDays,
  completionPercent,
  createTemplateTasks,
  daysUntil,
  localDateKey,
  remainingMinutes,
  replanIncompleteTasks,
} from "./lib/planner";
import { configureReminderRuntime, sendNativeReminder, type ReminderRuntimeStatus } from "./lib/native-reminders";
import { evaluateReminder, type ReminderDecision } from "./lib/reminders";
import {
  CREATION_STAGES,
  type AppState,
  type AppView,
  type CreationTask,
  type DailyRecord,
  type ProjectPlan,
  type UserPreferences,
} from "./types";

const STORAGE_KEY = "mickey-toolkit.state.v2";
const REMINDER_LOG_KEY = "mickey-toolkit.reminders.v1";
const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const todayKey = localDateKey();

const defaultPreferences: UserPreferences = {
  displayName: "",
  dailyStartTime: "19:00",
  dailyMinutes: 150,
  restWeekday: -1,
  reminderEnabled: true,
  launchAtStartup: true,
  distractionApps: ["steam.exe", "dota2.exe"],
  distractionSites: ["bilibili.com", "douyin.com"],
};

function emptyState(): AppState {
  return { schemaVersion: 2, project: null, preferences: defaultPreferences, focus: { status: "idle" }, records: [] };
}

function loadState(): AppState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as AppState | null;
    return parsed?.schemaVersion === 2
      ? { ...parsed, preferences: { ...defaultPreferences, ...parsed.preferences } }
      : emptyState();
  } catch {
    return emptyState();
  }
}

function formatMinutes(value: number): string {
  if (value < 60) return `${value}分钟`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours}小时${minutes}分` : `${hours}小时`;
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function prettyDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function ProgressRing({ value, size = 92 }: { value: number; size?: number }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100);
  return (
    <div className="progress-ring" style={{ width: size, height: size }} aria-label={`完成 ${value}%`}>
      <svg viewBox="0 0 92 92" aria-hidden="true">
        <circle className="ring-track" cx="46" cy="46" r={radius} />
        <circle className="ring-value" cx="46" cy="46" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <strong>{value}%</strong>
    </div>
  );
}

function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [view, setView] = useState<AppView>("today");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unavailableOpen, setUnavailableOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [quickTask, setQuickTask] = useState("");
  const [now, setNow] = useState(0);
  const [currentDateKey, setCurrentDateKey] = useState(todayKey);
  const [reminderToast, setReminderToast] = useState<(ReminderDecision & { native: boolean }) | null>(null);
  const [reminderRuntime, setReminderRuntime] = useState<ReminderRuntimeStatus | null>(null);

  const project = state.project;
  const tasks = project?.tasks ?? [];
  const todayTasks = tasks.filter((task) => task.plannedDate === currentDateKey);
  const todayDone = todayTasks.filter((task) => task.status === "done");
  const todayPercent = todayTasks.length ? Math.round((todayDone.length / todayTasks.length) * 100) : 0;
  const projectPercent = completionPercent(tasks);
  const remaining = remainingMinutes(tasks);
  const remainingToday = todayTasks.filter((task) => task.status !== "done").reduce((sum, task) => sum + task.estimateMinutes, 0);
  const nextTask = todayTasks.find((task) => task.status === "doing") ?? todayTasks.find((task) => task.status === "todo");
  const deadlineDays = project ? daysUntil(project.targetDate) : 0;
  const activeFocusTask = tasks.find((task) => task.id === state.focus.taskId);
  const focusElapsedMinutes = state.focus.startedAt ? Math.max(0, Math.floor((now - new Date(state.focus.startedAt).getTime()) / 60_000)) : 0;
  const focusTargetSeconds = (state.focus.durationMinutes ?? 0) * 60;
  const focusElapsedSeconds = state.focus.startedAt ? Math.max(0, Math.floor((now - new Date(state.focus.startedAt).getTime()) / 1000)) : 0;
  const focusRemainingSeconds = Math.max(0, focusTargetSeconds - focusElapsedSeconds);
  const unlockRemainingSeconds = state.focus.unlockUntil ? Math.max(0, Math.floor((new Date(state.focus.unlockUntil).getTime() - now) / 1000)) : 0;
  const canFinishFocus = focusElapsedMinutes >= 120 || (todayTasks.length > 0 && todayTasks.every((task) => task.status === "done") && focusElapsedMinutes >= 30);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state]);

  useEffect(() => {
    if (!project) return;
    configureReminderRuntime(state.preferences.reminderEnabled, state.preferences.launchAtStartup)
      .then(setReminderRuntime)
      .catch(() => setReminderRuntime({ native: true, permissionGranted: false, launchAtStartup: false }));
  }, [project, state.preferences.reminderEnabled, state.preferences.launchAtStartup]);

  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    const check = () => {
      const timestamp = Date.now();
      const dateKey = localDateKey(new Date(timestamp));
      setNow(timestamp);
      setCurrentDateKey(dateKey);
      const dayTasks = project.tasks.filter((task) => task.plannedDate === dateKey);
      const dayRecord = state.records.find((record) => record.date === dateKey);
      let sentKeys: string[] = [];
      try {
        sentKeys = JSON.parse(localStorage.getItem(REMINDER_LOG_KEY) ?? "[]") as string[];
      } catch {
        sentKeys = [];
      }
      const decision = evaluateReminder({
        now: new Date(timestamp),
        dailyStartTime: state.preferences.dailyStartTime,
        enabled: state.preferences.reminderEnabled,
        totalTasks: dayTasks.length,
        doneTasks: dayTasks.filter((task) => task.status === "done").length,
        remainingMinutes: dayTasks.filter((task) => task.status !== "done").reduce((sum, task) => sum + task.estimateMinutes, 0),
        focusStatus: state.focus.status,
        unavailable: Boolean(dayRecord?.unavailableReason || dayRecord?.usedDynamicRestDay || dayRecord?.absence),
        focusedMinutes: dayRecord?.focusedMinutes ?? 0,
        sentKeys,
      });
      if (!decision) return;
      const recentKeys = [...sentKeys.filter((key) => key.startsWith(dateKey)), decision.key];
      localStorage.setItem(REMINDER_LOG_KEY, JSON.stringify(recentKeys));
      setReminderToast({ ...decision, native: false });
      void sendNativeReminder(decision.title, decision.body).then((native) => {
        if (!cancelled) setReminderToast((current) => current?.key === decision.key ? { ...current, native } : current);
      });
    };
    check();
    const timer = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [project, state.preferences.dailyStartTime, state.preferences.reminderEnabled, state.focus.status, state.records]);

  useEffect(() => {
    if (!reminderToast) return;
    const timer = window.setTimeout(() => setReminderToast(null), 8_000);
    return () => window.clearTimeout(timer);
  }, [reminderToast]);

  useEffect(() => {
    if (state.focus.status === "idle") return;
    const timer = window.setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      setCurrentDateKey(localDateKey(new Date(timestamp)));
      setState((current) => {
        if (current.focus.status !== "temporary-unlock" || !current.focus.unlockUntil) return current;
        if (new Date(current.focus.unlockUntil).getTime() > timestamp) return current;
        const resumedAt = current.focus.startedAt
          ? new Date(new Date(current.focus.startedAt).getTime() + 15 * 60_000).toISOString()
          : undefined;
        return {
          ...current,
          focus: {
            ...current.focus,
            status: "active",
            startedAt: resumedAt,
            unlockUntil: undefined,
            unlockReason: undefined,
          },
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.focus.status]);

  function updateProject(updater: (current: ProjectPlan) => ProjectPlan) {
    setState((current) => current.project ? { ...current, project: updater(current.project) } : current);
  }

  function updateTask(taskId: string, updater: (task: CreationTask) => CreationTask) {
    updateProject((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? updater(task) : task) }));
  }

  function ensureRecord(current: AppState, date: string): { records: DailyRecord[]; index: number } {
    const index = current.records.findIndex((record) => record.date === date);
    if (index >= 0) return { records: [...current.records], index };
    return { records: [...current.records, { date, focusedMinutes: 0, completedTaskIds: [] }], index: current.records.length };
  }

  function toggleTask(task: CreationTask) {
    const done = task.status !== "done";
    updateTask(task.id, (current) => ({ ...current, status: done ? "done" : "todo", completedAt: done ? new Date().toISOString() : undefined }));
    setState((current) => {
      const { records, index } = ensureRecord(current, currentDateKey);
      const record = records[index];
      records[index] = {
        ...record,
        completedTaskIds: done
          ? [...new Set([...record.completedTaskIds, task.id])]
          : record.completedTaskIds.filter((id) => id !== task.id),
      };
      return { ...current, records };
    });
  }

  function startFocus(task: CreationTask) {
    updateTask(task.id, (current) => ({ ...current, status: "doing" }));
    setState((current) => ({
      ...current,
      focus: {
        status: "active",
        taskId: task.id,
        startedAt: new Date().toISOString(),
        durationMinutes: Math.min(120, Math.max(30, task.estimateMinutes)),
      },
    }));
    setNow(Date.now());
    setView("focus");
  }

  function finishFocus() {
    if (!canFinishFocus) return;
    setState((current) => {
      const { records, index } = ensureRecord(current, currentDateKey);
      records[index] = { ...records[index], focusedMinutes: records[index].focusedMinutes + focusElapsedMinutes };
      return { ...current, records, focus: { status: "idle" } };
    });
    setView("today");
  }

  function grantTemporaryUnlock() {
    if (!reason.trim()) return;
    setState((current) => ({
      ...current,
      focus: {
        ...current.focus,
        status: "temporary-unlock",
        unlockUntil: new Date(Date.now() + 15 * 60_000).toISOString(),
        unlockReason: reason.trim(),
      },
    }));
    setReason("");
    setUnlockOpen(false);
  }

  function addQuickTask() {
    if (!project || !quickTask.trim()) return;
    const stage = nextTask?.stage ?? CREATION_STAGES.find((item) => tasks.some((task) => task.stage === item && task.status !== "done")) ?? "素材梳理";
    const task: CreationTask = {
      id: crypto.randomUUID(),
      title: quickTask.trim(),
      note: "今天临时补充的任务",
      stage,
      estimateMinutes: 30,
      weight: 1,
      status: "todo",
      plannedDate: currentDateKey,
      createdAt: new Date().toISOString(),
    };
    updateProject((current) => ({ ...current, tasks: [...current.tasks, task] }));
    setQuickTask("");
  }

  function submitUnavailable() {
    if (!project || !reason.trim()) return;
    setState((current) => {
      if (!current.project) return current;
      const weekAgo = addDays(currentDateKey, -6);
      const restAlreadyUsed = current.records.some((record) => record.date >= weekAgo && record.usedDynamicRestDay);
      const { records, index } = ensureRecord(current, currentDateKey);
      records[index] = {
        ...records[index],
        focusedMinutes: records[index].focusedMinutes + focusElapsedMinutes,
        unavailableReason: reason.trim(),
        usedDynamicRestDay: !restAlreadyUsed,
        absence: restAlreadyUsed,
      };
      return {
        ...current,
        records,
        focus: { status: "idle" },
        project: {
          ...current.project,
          tasks: replanIncompleteTasks(current.project.tasks, currentDateKey, current.preferences.restWeekday, current.preferences.dailyMinutes),
        },
      };
    });
    setReason("");
    setUnavailableOpen(false);
    setView("today");
  }

  function resetProject() {
    if (!window.confirm("确定结束当前项目并重新设置吗？当前进度会从本软件中清除。")) return;
    setState(emptyState());
    setSettingsOpen(false);
    setView("today");
  }

  async function sendTestReminder() {
    const decision: ReminderDecision = {
      key: `test:${Date.now()}`,
      title: "测试提醒成功",
      body: "之后会按照你设置的开始时间，提醒你推进当天的视频任务。",
    };
    setReminderToast({ ...decision, native: false });
    const native = await sendNativeReminder(decision.title, decision.body);
    setReminderToast((current) => current?.key === decision.key ? { ...current, native } : current);
  }

  if (!project) return <Onboarding onCreate={(createdProject, preferences) => setState({ schemaVersion: 2, project: createdProject, preferences, focus: { status: "idle" }, records: [] })} />;

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <img src="/mickey-toolkit-icon.png" alt="" />
          <div><strong>米奇妙妙工具</strong><span>视频创作执行台</span></div>
        </div>

        <nav className="app-nav" aria-label="主要导航">
          <NavButton active={view === "today"} icon={<Gauge size={18} />} label="今天" onClick={() => setView("today")} />
          <NavButton active={view === "plan"} icon={<CalendarDays size={18} />} label="项目计划" onClick={() => setView("plan")} />
          <NavButton active={view === "focus"} icon={<Focus size={18} />} label="专注模式" onClick={() => setView("focus")} badge={state.focus.status !== "idle" ? "进行中" : undefined} />
          <NavButton active={view === "review"} icon={<BarChart3 size={18} />} label="周复盘" onClick={() => setView("review")} />
        </nav>

        <section className="side-project">
          <div className="side-label">当前项目</div>
          <strong>{project.name}</strong>
          <span>{project.game || "未填写素材来源"}</span>
          <div className="side-progress"><i style={{ width: `${projectPercent}%` }} /></div>
          <footer><span>{projectPercent}%</span><span>还剩{formatMinutes(remaining)}</span></footer>
        </section>

        <div className="sidebar-bottom">
          <div className={`guard-state ${state.focus.status !== "idle" ? "on" : ""}`}>
            <ShieldCheck size={17} />
            <div><strong>{state.focus.status !== "idle" ? "专注保护进行中" : "专注保护待命"}</strong><span>{state.preferences.distractionApps.length + state.preferences.distractionSites.length}项干扰源</span></div>
          </div>
          <button className="nav-settings" onClick={() => setSettingsOpen(true)}><Settings size={17} /><span>计划与软件设置</span></button>
        </div>
      </aside>

      <header className="app-topbar">
        <div className="breadcrumb"><span>{project.name}</span><ChevronRight size={14} /><strong>{view === "today" ? "今天" : view === "plan" ? "项目计划" : view === "focus" ? "专注模式" : "周复盘"}</strong></div>
        <div className="top-status"><AlarmClock size={15} /><span>每天 {state.preferences.dailyStartTime}</span><i /> <span>{state.preferences.reminderEnabled ? "督促开启" : "督促关闭"}</span><button aria-label="设置" onClick={() => setSettingsOpen(true)}><Settings size={16} /></button></div>
      </header>

      <main className="app-main">
        {view === "today" && <TodayView
          preferences={state.preferences}
          project={project}
          todayTasks={todayTasks}
          todayPercent={todayPercent}
          projectPercent={projectPercent}
          remainingToday={remainingToday}
          remaining={remaining}
          deadlineDays={deadlineDays}
          nextTask={nextTask}
          quickTask={quickTask}
          setQuickTask={setQuickTask}
          onAddQuickTask={addQuickTask}
          onToggleTask={toggleTask}
          onStartTask={startFocus}
          onUnavailable={() => setUnavailableOpen(true)}
        />}
        {view === "plan" && <PlanView project={project} onToggleTask={toggleTask} />}
        {view === "focus" && <FocusView
          task={activeFocusTask}
          focusStatus={state.focus.status}
          remainingSeconds={focusRemainingSeconds}
          elapsedMinutes={focusElapsedMinutes}
          unlockRemainingSeconds={unlockRemainingSeconds}
          unlockReason={state.focus.unlockReason}
          canFinish={canFinishFocus}
          onStart={() => nextTask && startFocus(nextTask)}
          onToggleTask={activeFocusTask ? () => toggleTask(activeFocusTask) : undefined}
          onUnlock={() => setUnlockOpen(true)}
          onFinish={finishFocus}
          onUnavailable={() => setUnavailableOpen(true)}
        />}
        {view === "review" && <ReviewView records={state.records} tasks={tasks} todayKey={currentDateKey} />}
      </main>

      {settingsOpen && <SettingsModal state={state} setState={setState} reminderRuntime={reminderRuntime} onTestReminder={sendTestReminder} onClose={() => setSettingsOpen(false)} onReset={resetProject} />}
      {unavailableOpen && <ReasonModal title="今天确实无法制作？" description="写下真实原因。每周第一次会使用动态休息日；之后会记录缺勤并把任务顺延。" reason={reason} setReason={setReason} confirm="确认并重新排期" onConfirm={submitUnavailable} onClose={() => { setUnavailableOpen(false); setReason(""); }} />}
      {unlockOpen && <ReasonModal title="临时解锁15分钟" description="写下你现在必须离开专注模式的原因。15分钟后会自动恢复。" reason={reason} setReason={setReason} confirm="开始临时解锁" onConfirm={grantTemporaryUnlock} onClose={() => { setUnlockOpen(false); setReason(""); }} />}
      {reminderToast && <button className="reminder-toast" onClick={() => { setView("today"); setReminderToast(null); }}><BellRing size={19} /><span><strong>{reminderToast.title}</strong><small>{reminderToast.body}</small></span><em>{reminderToast.native ? "Windows已提醒" : "软件内提醒"}</em></button>}
    </div>
  );
}

function NavButton({ active, icon, label, badge, onClick }: { active: boolean; icon: React.ReactNode; label: string; badge?: string; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick}>{icon}<span>{label}</span>{badge && <em>{badge}</em>}</button>;
}

function TodayView(props: {
  preferences: UserPreferences;
  project: ProjectPlan;
  todayTasks: CreationTask[];
  todayPercent: number;
  projectPercent: number;
  remainingToday: number;
  remaining: number;
  deadlineDays: number;
  nextTask?: CreationTask;
  quickTask: string;
  setQuickTask: (value: string) => void;
  onAddQuickTask: () => void;
  onToggleTask: (task: CreationTask) => void;
  onStartTask: (task: CreationTask) => void;
  onUnavailable: () => void;
}) {
  const date = new Date();
  const dayText = `${date.getMonth() + 1}月${date.getDate()}日 · ${weekdays[date.getDay()]}`;
  return <div className="page today-page">
    <section className="page-hero">
      <div><span className="eyebrow">TODAY'S PLAN</span><h1>{props.preferences.displayName ? `${props.preferences.displayName}，` : ""}今天只推进这一小步</h1><p>{dayText} · 计划投入 {formatMinutes(props.preferences.dailyMinutes)} · {props.project.primaryPlatform}优先</p></div>
      <div className="hero-actions"><button className="button secondary" onClick={props.onUnavailable}><Coffee size={16} />今天无法制作</button><button className="button primary" disabled={!props.nextTask} onClick={() => props.nextTask && props.onStartTask(props.nextTask)}><Play size={16} />开始制作</button></div>
    </section>

    <section className="metrics-grid">
      <article className="metric-card ring-card"><ProgressRing value={props.todayPercent} /><div><span>今日完成</span><strong>{props.todayTasks.filter((task) => task.status === "done").length} / {props.todayTasks.length}项</strong><small>{props.remainingToday ? `还需约${formatMinutes(props.remainingToday)}` : "今天的任务已经完成"}</small></div></article>
      <article className="metric-card"><span className="metric-icon violet"><TrendingUp size={18} /></span><div><span>项目总进度</span><strong>{props.projectPercent}%</strong><div className="metric-bar"><i style={{ width: `${props.projectPercent}%` }} /></div></div></article>
      <article className="metric-card"><span className="metric-icon green"><Clock3 size={18} /></span><div><span>剩余工作量</span><strong>{formatMinutes(props.remaining)}</strong><small>根据当前任务估算</small></div></article>
      <article className={`metric-card ${props.deadlineDays < 3 ? "risk" : ""}`}><span className="metric-icon amber"><Target size={18} /></span><div><span>距离目标发布</span><strong>{props.deadlineDays >= 0 ? `${props.deadlineDays}天` : `超出${Math.abs(props.deadlineDays)}天`}</strong><small>{prettyDate(props.project.targetDate)}</small></div></article>
    </section>

    <section className="today-grid">
      <div className="task-panel panel">
        <header className="panel-header"><div><ListChecks size={18} /><div><strong>今天的任务</strong><span>按顺序完成，不需要同时想着全部</span></div></div><b>{props.todayTasks.length}项</b></header>
        <div className="task-list">
          {props.todayTasks.length === 0 ? <div className="empty-day"><Coffee size={28} /><strong>今天没有安排任务</strong><span>这是休息日，或者项目任务已经完成。</span></div> : props.todayTasks.map((task, index) => <TaskRow key={task.id} task={task} recommended={task.id === props.nextTask?.id} index={index} onToggle={() => props.onToggleTask(task)} onStart={() => props.onStartTask(task)} />)}
        </div>
        <div className="quick-add"><Plus size={16} /><input value={props.quickTask} onChange={(event) => props.setQuickTask(event.target.value)} onKeyDown={(event) => event.key === "Enter" && props.onAddQuickTask()} placeholder="临时补充一个今天必须完成的任务…"/><button disabled={!props.quickTask.trim()} onClick={props.onAddQuickTask}>添加</button></div>
      </div>

      <aside className="today-side">
        <section className="next-card panel"><span className="eyebrow">ONE NEXT THING</span><div className="next-icon"><Sparkles size={21} /></div><h2>{props.nextTask?.title ?? "今天已经完成"}</h2><p>{props.nextTask?.note ?? "现在可以安心休息，明天再继续。"}</p>{props.nextTask && <><div className="next-meta"><span>{props.nextTask.stage}</span><span>{formatMinutes(props.nextTask.estimateMinutes)}</span></div><button className="button primary full" onClick={() => props.onStartTask(props.nextTask!)}>只做这一件<ArrowRight size={16} /></button></>}</section>
        <section className="guard-card panel"><header><BellRing size={18} /><div><strong>今日督促</strong><span>{props.preferences.reminderEnabled ? "Windows提醒正在待命" : "当前已关闭"}</span></div><i /></header><ul><li><AlarmClock size={14} />每天 {props.preferences.dailyStartTime} 开始提醒</li><li><Power size={14} />{props.preferences.launchAtStartup ? "开机后自动在后台待命" : "需要手动打开软件"}</li></ul><small>15分钟未开始会再次提醒；之后每30分钟一次。专注中、完成或休息时自动静音。</small></section>
      </aside>
    </section>
  </div>;
}

function TaskRow({ task, recommended, index, onToggle, onStart }: { task: CreationTask; recommended: boolean; index: number; onToggle: () => void; onStart: () => void }) {
  return <article className={`task-row ${task.status} ${recommended ? "recommended" : ""}`}>
    <button className="task-check" aria-label={task.status === "done" ? "恢复任务" : "完成任务"} onClick={onToggle}>{task.status === "done" && <Check size={16} />}</button>
    <span className="task-order">{String(index + 1).padStart(2, "0")}</span>
    <div className="task-copy"><div><span className={`stage-chip stage-${CREATION_STAGES.indexOf(task.stage)}`}>{task.stage}</span>{recommended && <em>建议下一步</em>}</div><strong>{task.title}</strong><p>{task.note}</p></div>
    <div className="task-time"><Clock3 size={14} /><span>{task.estimateMinutes}分钟</span><small>权重 {task.weight}</small></div>
    {task.status !== "done" && <button className="task-start" onClick={onStart}>{task.status === "doing" ? "继续" : "开始"}<Play size={13} /></button>}
  </article>;
}

function PlanView({ project, onToggleTask }: { project: ProjectPlan; onToggleTask: (task: CreationTask) => void }) {
  return <div className="page plan-page"><section className="page-hero"><div><span className="eyebrow">PROJECT ROADMAP</span><h1>从素材到发布，只保留七个阶段</h1><p>{project.name} · 目标 {prettyDate(project.targetDate)} 发布</p></div><div className="hero-progress"><ProgressRing value={completionPercent(project.tasks)} size={78} /><span>总进度</span></div></section><section className="stage-list">{CREATION_STAGES.map((stage, index) => {
    const stageTasks = project.tasks.filter((task) => task.stage === stage);
    const done = stageTasks.filter((task) => task.status === "done").length;
    const percent = stageTasks.length ? Math.round((done / stageTasks.length) * 100) : 0;
    return <article className="stage-card" key={stage}><div className="stage-index">{String(index + 1).padStart(2, "0")}</div><div className="stage-summary"><span>阶段 {index + 1}</span><h2>{stage}</h2><p>{stageTasks.length}项 · {formatMinutes(stageTasks.reduce((sum, task) => sum + task.estimateMinutes, 0))}</p></div><div className="stage-tasks">{stageTasks.map((task) => <button key={task.id} className={task.status === "done" ? "done" : ""} onClick={() => onToggleTask(task)}><i>{task.status === "done" && <Check size={11} />}</i><span>{task.title}</span><small>{prettyDate(task.plannedDate)}</small></button>)}</div><div className="stage-percent"><strong>{percent}%</strong><div><i style={{ width: `${percent}%` }} /></div></div></article>;
  })}</section></div>;
}

function FocusView(props: { task?: CreationTask; focusStatus: AppState["focus"]["status"]; remainingSeconds: number; elapsedMinutes: number; unlockRemainingSeconds: number; unlockReason?: string; canFinish: boolean; onStart: () => void; onToggleTask?: () => void; onUnlock: () => void; onFinish: () => void; onUnavailable: () => void }) {
  const active = props.focusStatus !== "idle";
  return <div className="page focus-page"><section className={`focus-stage ${active ? "active" : ""}`}><div className="focus-orbit"><span>{props.focusStatus === "temporary-unlock" ? "临时解锁" : active ? "正在专注" : "等待开始"}</span><strong>{props.focusStatus === "temporary-unlock" ? formatClock(props.unlockRemainingSeconds) : active ? formatClock(props.remainingSeconds) : "02:00:00"}</strong><small>{active ? `已经投入 ${props.elapsedMinutes} 分钟` : "建议按今天的第一项任务开始"}</small></div><div className="focus-task"><span className="eyebrow">CURRENT TASK</span><h1>{props.task?.title ?? "还没有开始任务"}</h1><p>{props.focusStatus === "temporary-unlock" ? `解锁原因：${props.unlockReason}` : props.task?.note ?? "回到今天页面选择一项任务，或直接开始建议任务。"}</p></div><div className="focus-actions">{!active ? <button className="button primary large" onClick={props.onStart}><Play size={18} />开始制作</button> : <><button className="button secondary" onClick={props.onUnlock}><TimerReset size={17} />临时解锁15分钟</button>{props.task?.status !== "done" && <button className="button success" onClick={props.onToggleTask}><CheckCircle2 size={17} />这项已完成</button>}<button className="button primary" disabled={!props.canFinish} title={props.canFinish ? "结束专注" : "完成今天任务并专注满30分钟，或累计专注120分钟后可结束"} onClick={props.onFinish}>结束专注</button></>}</div>{active && !props.canFinish && <div className="focus-rule"><LockKeyhole size={15} />完成今天任务并专注满30分钟，或累计专注120分钟后正常结束。</div>}<button className="text-button" onClick={props.onUnavailable}>确实无法继续，说明原因并重新排期</button></section></div>;
}

function ReviewView({ records, tasks, todayKey }: { records: DailyRecord[]; tasks: CreationTask[]; todayKey: string }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(todayKey, index - 6));
  const doneThisWeek = tasks.filter((task) => task.completedAt && localDateKey(new Date(task.completedAt)) >= days[0]).length;
  const plannedThisWeek = tasks.filter((task) => task.plannedDate >= days[0] && task.plannedDate <= todayKey).length;
  const completion = plannedThisWeek ? Math.min(100, Math.round((doneThisWeek / plannedThisWeek) * 100)) : 0;
  const focused = records.filter((record) => record.date >= days[0]).reduce((sum, record) => sum + record.focusedMinutes, 0);
  const absences = records.filter((record) => record.date >= days[0] && record.absence).length;
  return <div className="page review-page"><section className="page-hero"><div><span className="eyebrow">WEEKLY REVIEW</span><h1>只看执行事实，不评价你这个人</h1><p>完成率是主指标；专注时间、休息和缺勤只用于调整下周计划。</p></div></section><section className="review-metrics"><article><TrendingUp size={19} /><span>本周完成率</span><strong>{completion}%</strong></article><article><Clock3 size={19} /><span>累计专注</span><strong>{formatMinutes(focused)}</strong></article><article><CheckCircle2 size={19} /><span>完成任务</span><strong>{doneThisWeek}项</strong></article><article className={absences ? "risk" : ""}><CalendarDays size={19} /><span>缺勤</span><strong>{absences}天</strong></article></section><section className="week-chart panel"><header><div><strong>最近7天</strong><span>绿色为完成任务，紫色为专注时间</span></div></header><div className="week-bars">{days.map((date) => { const record = records.find((item) => item.date === date); const completed = record?.completedTaskIds.length ?? 0; const focus = record?.focusedMinutes ?? 0; return <div key={date} className="week-column"><div className="bars"><i className="focus-bar" style={{ height: `${Math.min(100, focus / 1.5)}%` }} /><i className="done-bar" style={{ height: `${Math.min(100, completed * 24)}%` }} /></div><strong>{weekdays[new Date(`${date}T12:00:00`).getDay()].slice(1)}</strong><span>{record?.usedDynamicRestDay ? "休" : record?.absence ? "缺" : completed || focus ? "做" : "—"}</span></div>; })}</div></section></div>;
}

function Onboarding({ onCreate }: { onCreate: (project: ProjectPlan, preferences: UserPreferences) => void }) {
  const [name, setName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [game, setGame] = useState("");
  const [platform, setPlatform] = useState<ProjectPlan["primaryPlatform"]>("B站");
  const [startTime, setStartTime] = useState("19:00");
  const [dailyMinutes, setDailyMinutes] = useState(150);
  const [restWeekday, setRestWeekday] = useState(-1);
  const [targetDate, setTargetDate] = useState(addDays(todayKey, 14));

  function submit() {
    if (!projectName.trim()) return;
    const preferences: UserPreferences = { ...defaultPreferences, displayName: name.trim(), dailyStartTime: startTime, dailyMinutes, restWeekday };
    const project: ProjectPlan = { id: crypto.randomUUID(), name: projectName.trim(), game: game.trim(), primaryPlatform: platform, startDate: todayKey, targetDate, createdAt: new Date().toISOString(), tasks: createTemplateTasks(todayKey, dailyMinutes, restWeekday) };
    onCreate(project, preferences);
  }

  return <main className="onboarding"><section className="onboarding-card"><div className="onboarding-visual"><img src="/mickey-toolkit-icon.png" alt="" /><span className="eyebrow">WELCOME</span><h1>张诗语の<br/>米奇妙妙工具</h1><p>它不替你做视频，只把每天该做的事情摆在眼前，并陪你按时做完。</p><ul><li><Check size={15} />每天只安排2～5项</li><li><Check size={15} />清楚显示还差多少</li><li><Check size={15} />开始后进入专注状态</li></ul></div><form onSubmit={(event) => { event.preventDefault(); submit(); }}><header><span>第一次设置</span><h2>先建立你的当前项目</h2><p>每个人填写自己的时间，只保存在当前电脑。</p></header><div className="form-grid"><label><span>怎么称呼你</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="可不填" /></label><label><span>项目名称 *</span><input autoFocus required value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="例如：Low-Budget Repairs" /></label><label><span>游戏或素材来源</span><input value={game} onChange={(event) => setGame(event.target.value)} placeholder="例如：Low-Budget Repairs" /></label><label><span>主要发布平台</span><select value={platform} onChange={(event) => setPlatform(event.target.value as ProjectPlan["primaryPlatform"])}><option>B站</option><option>抖音</option><option>小红书</option><option>快手</option><option>其他</option></select></label><label><span>每天几点开始</span><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label><label><span>每天计划投入</span><select value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))}><option value={120}>2小时</option><option value={150}>2.5小时</option><option value={180}>3小时</option></select></label><label><span>每周休息安排</span><select value={restWeekday} onChange={(event) => setRestWeekday(Number(event.target.value))}><option value={-1}>动态休息（推荐）</option>{weekdays.map((day, index) => <option key={day} value={index}>固定{day}</option>)}</select></label><label><span>目标发布日期</span><input type="date" min={todayKey} value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label></div><button className="button primary onboarding-submit" disabled={!projectName.trim()} type="submit">生成第一份每日计划<ArrowRight size={17} /></button></form></section></main>;
}

function SettingsModal({ state, setState, reminderRuntime, onTestReminder, onClose, onReset }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; reminderRuntime: ReminderRuntimeStatus | null; onTestReminder: () => void; onClose: () => void; onReset: () => void }) {
  const [draft, setDraft] = useState(state.preferences);
  const [targetDate, setTargetDate] = useState(state.project?.targetDate ?? todayKey);
  function save() {
    setState((current) => ({ ...current, preferences: draft, project: current.project ? { ...current.project, targetDate } : null }));
    onClose();
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal settings-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><span>PERSONAL SETTINGS</span><h2>计划与软件设置</h2></div><button aria-label="关闭" onClick={onClose}><X size={18} /></button></header><div className="settings-sections"><section><h3>每日节奏</h3><div className="form-grid"><label><span>称呼</span><input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} /></label><label><span>开始时间</span><input type="time" value={draft.dailyStartTime} onChange={(event) => setDraft({ ...draft, dailyStartTime: event.target.value })} /></label><label><span>每日投入</span><select value={draft.dailyMinutes} onChange={(event) => setDraft({ ...draft, dailyMinutes: Number(event.target.value) })}><option value={120}>2小时</option><option value={150}>2.5小时</option><option value={180}>3小时</option></select></label><label><span>每周休息安排</span><select value={draft.restWeekday} onChange={(event) => setDraft({ ...draft, restWeekday: Number(event.target.value) })}><option value={-1}>动态休息（推荐）</option>{weekdays.map((day, index) => <option key={day} value={index}>固定{day}</option>)}</select></label><label><span>目标发布日期</span><input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label></div></section><section><h3>督促提醒</h3><label className="toggle-row"><input type="checkbox" checked={draft.reminderEnabled} onChange={(event) => setDraft({ ...draft, reminderEnabled: event.target.checked })} /><span><BellRing size={17} /><strong>每天按设置时间督促</strong><small>到点、15分钟未开始、之后每30分钟</small></span><i /></label><label className={`toggle-row ${!draft.reminderEnabled ? "disabled" : ""}`}><input type="checkbox" disabled={!draft.reminderEnabled} checked={draft.launchAtStartup} onChange={(event) => setDraft({ ...draft, launchAtStartup: event.target.checked })} /><span><Power size={17} /><strong>开机后在后台待命</strong><small>关闭窗口后仍保留在系统托盘</small></span><i /></label><div className={`runtime-state ${reminderRuntime?.native && reminderRuntime.permissionGranted ? "ready" : "warning"}`}><CircleDot size={14} /><span>{!reminderRuntime ? "保存后检查Windows提醒状态" : !reminderRuntime.native ? "浏览器预览不发送Windows通知" : reminderRuntime.permissionGranted ? `Windows通知已就绪${reminderRuntime.launchAtStartup ? " · 开机自启已开启" : ""}` : "Windows通知权限未开启，请在系统设置中允许"}</span></div><button className="test-reminder" disabled={!draft.reminderEnabled} onClick={onTestReminder}><BellRing size={14} />发送一条测试提醒</button><h3 className="settings-subheading">干扰名单</h3><label className="wide-label"><span>应用进程名，用逗号分隔</span><textarea value={draft.distractionApps.join(", ")} onChange={(event) => setDraft({ ...draft, distractionApps: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label><label className="wide-label"><span>网站域名，用逗号分隔</span><textarea value={draft.distractionSites.join(", ")} onChange={(event) => setDraft({ ...draft, distractionSites: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label><p className="settings-note"><ShieldCheck size={15} />名单已经保存；系统级阻止会在Windows原生切片中接通。</p></section></div><footer><button className="danger-link" onClick={onReset}>结束并重设当前项目</button><div><button className="button secondary" onClick={onClose}>取消</button><button className="button primary" onClick={save}>保存设置</button></div></footer></section></div>;
}

function ReasonModal({ title, description, reason, setReason, confirm, onConfirm, onClose }: { title: string; description: string; reason: string; setReason: (value: string) => void; confirm: string; onConfirm: () => void; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal reason-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><span>HONEST CHECK-IN</span><h2>{title}</h2></div><button aria-label="关闭" onClick={onClose}><X size={18} /></button></header><div className="reason-body"><p>{description}</p><label><span>原因 *</span><textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder="例如：临时加班、身体不舒服、必须处理家庭事务…" /></label></div><footer><button className="button secondary" onClick={onClose}>返回</button><button className="button primary" disabled={!reason.trim()} onClick={onConfirm}>{confirm}</button></footer></section></div>;
}

export default App;
