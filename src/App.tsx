import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, FileText, Film, FolderOpen, Gauge, Import, Library, ListFilter, MessageSquareText, Pause, Play, Plus, Search, Settings, SkipBack, SkipForward, Sparkles, Tags, Target, WandSparkles, X } from "lucide-react";
import "./App.css";
import { apiKeyExists, chooseVideo, chooseXmlDestination, desktopMediaUrl, exportPremiereXml, initialiseDatabase, probeMedia, runningInDesktop, saveApiKey, saveProject } from "./lib/desktop";
import { clampTime, formatTime } from "./lib/time";
import type { AppSettings, MaterialNode, MaterialNodeKind, MediaItem, Project, ProjectStage } from "./types";

const stages: ProjectStage[] = ["素材整理", "方向发散", "主线设计", "大纲", "脚本", "审阅"];
const nodeKinds: MaterialNodeKind[] = ["笑点", "信息", "情绪", "过场", "删除候选"];
const seedProjects: Project[] = [
  { id: "royal-agent", name: "007：皇家特工学院", game: "007 First Light", stage: "素材整理", updatedAt: "刚刚", mediaCount: 0 },
  { id: "low-budget", name: "Low-Budget Repairs", game: "Low-Budget Repairs", stage: "脚本", updatedAt: "昨天", mediaCount: 1 },
  { id: "beast", name: "轮回之兽", game: "The Beast of Reincarnation", stage: "方向发散", updatedAt: "3天前", mediaCount: 0 },
];
const seedNodes: MaterialNode[] = [
  { id: "n1", mediaId: "demo", start: 12.4, end: 18.8, text: "开场爆炸后邦德从废墟里站起来，第一句仍在强调一切都在计划内。", kind: "笑点", score: 92, source: "AI分析" },
  { id: "n2", mediaId: "demo", start: 31.2, end: 47.6, text: "教官说明训练规则：不能惊动任何人，必须完整带回文件。", kind: "信息", score: 86, source: "本地转写" },
  { id: "n3", mediaId: "demo", start: 64.1, end: 71.3, text: "邦德把“不惊动任何人”理解成“不留下愿意作证的人”。", kind: "笑点", score: 96, source: "人工" },
  { id: "n4", mediaId: "demo", start: 89.2, end: 103.8, text: "监控室突然安静，教官看向镜头；适合作为节奏降速和气质转折。", kind: "情绪", score: 83, source: "AI分析" },
];
const defaultSettings: AppSettings = { provider: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-5.2", hasApiKey: false, transcriptionModel: "medium", transcriptionDevice: "auto" };

function readStoredProjects(): Project[] {
  try { const value = localStorage.getItem("frame.projects"); return value ? JSON.parse(value) : seedProjects; }
  catch { return seedProjects; }
}
function fileNameFromPath(path: string): string { return path.split(/[\\/]/).pop() || "未命名视频"; }

function App() {
  const [projects, setProjects] = useState<Project[]>(readStoredProjects);
  const [activeProjectId, setActiveProjectId] = useState(projects[0]?.id ?? "royal-agent");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<MaterialNode[]>(seedNodes);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [nodeFilter, setNodeFilter] = useState<MaterialNodeKind | "全部">("全部");
  const [search, setSearch] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("本地项目已就绪");
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectGame, setNewProjectGame] = useState("");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [addingNode, setAddingNode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const browserFileRef = useRef<HTMLInputElement>(null);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const projectMedia = useMemo(() => media.filter((item) => item.projectId === activeProjectId), [media, activeProjectId]);
  const activeMedia = media.find((item) => item.id === activeMediaId && item.projectId === activeProjectId) ?? null;
  const duration = activeMedia?.duration || 0;
  const filteredNodes = useMemo(() => nodes.filter((node) => (nodeFilter === "全部" || node.kind === nodeFilter) && (!search.trim() || node.text.toLowerCase().includes(search.toLowerCase()))), [nodes, nodeFilter, search]);

  useEffect(() => { localStorage.setItem("frame.projects", JSON.stringify(projects)); }, [projects]);
  useEffect(() => {
    void initialiseDatabase().catch(() => setStatus("浏览器预览模式：数据暂存于当前设备"));
    void apiKeyExists("openai").then((exists) => setSettings((value) => ({ ...value, hasApiKey: exists }))).catch(() => undefined);
  }, []);

  async function addDesktopVideo() {
    try {
      if (!runningInDesktop()) { browserFileRef.current?.click(); return; }
      const path = await chooseVideo(); if (!path) return;
      const id = crypto.randomUUID();
      const pending: MediaItem = { id, projectId: activeProject.id, name: fileNameFromPath(path), path, previewUrl: desktopMediaUrl(path), duration: 0, status: "probing" };
      setMedia((items) => [...items, pending]); setActiveMediaId(id); setStatus("正在读取视频信息…");
      const info = await probeMedia(path);
      setMedia((items) => items.map((item) => item.id === id ? { ...item, ...info, status: "ready" } : item));
      setProjects((items) => items.map((project) => project.id === activeProject.id ? { ...project, mediaCount: project.mediaCount + 1, updatedAt: "刚刚" } : project));
      setStatus("视频已导入，可以开始本地转写");
    } catch (error) { setStatus(`导入失败：${error instanceof Error ? error.message : "无法读取视频"}`); }
  }

  function addBrowserVideo(file?: File) {
    if (!file) return;
    const id = crypto.randomUUID();
    const item: MediaItem = { id, projectId: activeProject.id, name: file.name, path: file.name, previewUrl: URL.createObjectURL(file), duration: 0, size: file.size, status: "ready" };
    setMedia((items) => [...items, item]); setActiveMediaId(id);
    setProjects((items) => items.map((project) => project.id === activeProject.id ? { ...project, mediaCount: project.mediaCount + 1, updatedAt: "刚刚" } : project));
    setStatus("视频已载入预览；桌面版将继续读取完整媒体信息");
  }
  function seekTo(seconds: number) { const target = clampTime(seconds, duration || seconds); setCurrentTime(target); if (videoRef.current) videoRef.current.currentTime = target; }
  function togglePlayback() { if (!videoRef.current) return; if (videoRef.current.paused) void videoRef.current.play(); else videoRef.current.pause(); }
  function selectProject(projectId: string) {
    setActiveProjectId(projectId);
    setActiveMediaId(media.find((item) => item.projectId === projectId)?.id ?? null);
    setCurrentTime(0);
    setPlaying(false);
  }
  function createProject() {
    if (!newProjectName.trim()) return;
    const project: Project = { id: crypto.randomUUID(), name: newProjectName.trim(), game: newProjectGame.trim() || "未填写游戏", stage: "素材整理", updatedAt: "刚刚", mediaCount: 0 };
    setProjects((items) => [project, ...items]); selectProject(project.id); setNewProjectName(""); setNewProjectGame(""); setNewProjectOpen(false); setStatus("新项目已创建"); void saveProject(project).catch(() => undefined);
  }
  function addNode(kind: MaterialNodeKind) {
    const node: MaterialNode = { id: crypto.randomUUID(), mediaId: activeMediaId ?? "demo", start: currentTime, end: currentTime + 5, text: "在这里补充这个时间段发生了什么，以及它为什么值得保留。", kind, score: 70, source: "人工" };
    setNodes((items) => [...items, node].sort((a, b) => a.start - b.start)); setActiveNodeId(node.id); setAddingNode(false); setStatus(`已在 ${formatTime(currentTime)} 添加${kind}节点`);
  }
  async function storeApiKey() {
    if (!apiKeyDraft.trim()) return;
    try { await saveApiKey(settings.provider, apiKeyDraft.trim()); setSettings((value) => ({ ...value, hasApiKey: true })); setApiKeyDraft(""); setStatus("API Key 已安全保存到 Windows 凭据管理器"); }
    catch { setStatus("浏览器预览不会保存真实 API Key"); }
  }
  async function exportXml() {
    if (!activeMedia) { setStatus("请先选择一个视频素材"); return; }
    if (!runningInDesktop()) { setStatus("Premiere XML 需在 Windows 桌面版中导出"); return; }
    try {
      const outputPath = await chooseXmlDestination(`${activeProject.name}-markers.xml`);
      if (!outputPath) return;
      setStatus("正在导出 Premiere XML…");
      await exportPremiereXml(outputPath, activeProject.name, activeMedia.path, nodes.map((node) => ({ start: node.start, end: node.end, name: node.kind, comment: node.text })));
      setStatus("Premiere XML 已导出");
    } catch (error) { setStatus(`导出失败：${error instanceof Error ? error.message : "无法写入 XML"}`); }
  }

  return <div className="desktop-app">
    <input ref={browserFileRef} className="sr-only" type="file" accept="video/*,.mkv" onChange={(event) => addBrowserVideo(event.target.files?.[0])}/>
    <header className="titlebar">
      <div className="brand"><span className="brand-icon"><Sparkles size={17}/></span><div><b>FRAME / 文场</b><small>视频创作工作台</small></div></div>
      <div className="project-path"><span className="ready-dot"/><span>{activeProject?.name}</span><ChevronRight size={13}/><strong>素材整理</strong></div>
      <label className="global-search"><Search size={15}/><input aria-label="搜索项目或素材" placeholder="搜索项目、素材或时间码…"/><kbd>Ctrl K</kbd></label>
      <div className="title-actions"><span className="local-state" aria-live="polite">{status}</span><button className="ghost-icon" aria-label="帮助"><CircleHelp size={17}/></button><button className="avatar">S</button></div>
    </header>

    <aside className="sidebar">
      <nav className="primary-nav" aria-label="主要导航"><button className="active"><Gauge size={17}/><span>工作台</span></button><button><Film size={17}/><span>素材</span></button><button><Target size={17}/><span>主线与大纲</span></button><button><FileText size={17}/><span>脚本</span></button><button><MessageSquareText size={17}/><span>检查记录</span><em>2</em></button></nav>
      <div className="section-label"><span>本机项目</span><button aria-label="新建项目" onClick={() => setNewProjectOpen(true)}><Plus size={15}/></button></div>
      <div className="project-stack">{projects.map((project) => <button key={project.id} className={`project-row ${project.id === activeProjectId ? "active" : ""}`} onClick={() => selectProject(project.id)}><span className="project-icon"><Play size={12}/></span><span className="project-meta"><b>{project.name}</b><small>{project.game}</small><i>{project.stage} · {project.updatedAt}</i></span><span className="media-count">{project.mediaCount}</span></button>)}</div>
      <div className="sidebar-foot"><div className="privacy-card"><FolderOpen size={16}/><div><b>全部保存在本机</b><span>项目和视频不会自动上传</span></div></div><button className="settings-button" onClick={() => setSettingsOpen(true)}><Settings size={17}/><span>模型与软件设置</span></button></div>
    </aside>

    <main className="workspace">
      <section className="workspace-header"><div><div className="eyebrow">LOCAL PROJECT</div><div className="headline"><h1>{activeProject?.name}</h1><span><i/>单机项目</span></div><p>{activeProject?.game} · 先把素材变成可用节点，再进入主线、大纲和脚本。</p></div><div className="header-actions"><button className="secondary" onClick={() => setSettingsOpen(true)}><Settings size={15}/>模型设置</button><button className="primary" onClick={addDesktopVideo}><Import size={16}/>导入视频</button></div></section>
      <section className="stage-bar" aria-label="创作阶段">{stages.map((stage, index) => <button key={stage} className={index === 0 ? "active" : ""}><span>{index === 0 ? <Play size={10}/> : index + 1}</span><b>{stage}</b>{index < stages.length - 1 && <i/>}</button>)}</section>

      <section className="media-workspace">
        <aside className="media-bin"><div className="panel-heading"><div><b>项目素材</b><span>{projectMedia.length} 个视频</span></div><button aria-label="导入视频" onClick={addDesktopVideo}><Plus size={15}/></button></div><div className="media-list">{projectMedia.length === 0 ? <div className="mini-empty"><Library size={22}/><b>还没有素材</b><p>导入本机视频后，这里会显示时长、分辨率和转写状态。</p><button onClick={addDesktopVideo}>选择视频</button></div> : projectMedia.map((item) => <button key={item.id} className={`media-row ${item.id === activeMediaId ? "active" : ""}`} onClick={() => setActiveMediaId(item.id)}><span className="media-thumbnail"><Film size={16}/></span><span><b>{item.name}</b><small>{item.duration ? formatTime(item.duration) : "等待读取"} · {item.width && item.height ? `${item.width}×${item.height}` : "本地视频"}</small><i className={item.status}>{item.status === "probing" ? "读取中" : item.status === "ready" ? "可分析" : item.status === "transcribing" ? "转写中" : "需检查"}</i></span></button>)}</div><div className="analysis-card"><div><WandSparkles size={15}/><b>本地分析流程</b></div><ol><li className={activeMedia ? "done" : "active"}>读取视频与音轨</li><li className={activeMedia ? "active" : ""}>本地语音转写</li><li>生成事件与高能节点</li><li>人工确认后进入大纲</li></ol></div></aside>

        <section className="player-column">
          <div className="player-card"><div className="player-title"><div><span className="pulse-dot"/><b>{activeMedia?.name ?? "视频预览"}</b></div><span>{activeMedia ? `${activeMedia.width ?? "—"}×${activeMedia.height ?? "—"} · ${activeMedia.fps ?? "—"}fps` : "等待导入本地视频"}</span></div><div className={`video-frame ${activeMedia ? "has-video" : ""}`}>{activeMedia ? <video ref={videoRef} src={activeMedia.previewUrl} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onLoadedMetadata={(event) => setMedia((items) => items.map((item) => item.id === activeMedia.id ? { ...item, duration: event.currentTarget.duration || item.duration } : item))}/> : <div className="video-empty"><span className="video-empty-icon"><Film size={28}/></span><h2>把原始素材导进来</h2><p>软件会在本机读取视频、提取音轨，并生成带时间码的转写结果。</p><button onClick={addDesktopVideo}><Import size={15}/>导入第一个视频</button></div>}</div><div className="transport"><button aria-label="后退五秒" onClick={() => seekTo(currentTime - 5)}><SkipBack size={17}/></button><button className="play-button" aria-label={playing ? "暂停" : "播放"} onClick={togglePlayback}>{playing ? <Pause size={17}/> : <Play size={17}/>}</button><button aria-label="前进五秒" onClick={() => seekTo(currentTime + 5)}><SkipForward size={17}/></button><strong>{formatTime(currentTime)} <span>/ {formatTime(duration)}</span></strong><input aria-label="播放进度" type="range" min="0" max={Math.max(duration, 1)} step="0.04" value={Math.min(currentTime, Math.max(duration, 1))} onChange={(event) => seekTo(Number(event.target.value))}/><button className="speed">1.0×</button></div></div>
          <div className="timeline-card"><div className="timeline-head"><div><b>素材节点时间线</b><span>点击节点跳转画面</span></div><div className="node-legend">{nodeKinds.slice(0,4).map((kind) => <span key={kind} className={`kind-${kind}`}><i/>{kind}</span>)}</div></div><div className="ruler"><span>00:00</span><span>00:30</span><span>01:00</span><span>01:30</span><span>02:00</span></div><div className="timeline-track" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); seekTo(((event.clientX - rect.left) / rect.width) * Math.max(duration, 120)); }}><div className="waveform"/>{nodes.map((node) => <button key={node.id} aria-label={`${formatTime(node.start)} ${node.kind}节点，价值 ${node.score}`} title={node.text} className={`timeline-node kind-${node.kind} ${activeNodeId === node.id ? "active" : ""}`} style={{ left: `${Math.min((node.start / Math.max(duration, 120)) * 100, 96)}%` }} onClick={(event) => { event.stopPropagation(); setActiveNodeId(node.id); seekTo(node.start); }}><span>{node.score}</span></button>)}<i className="playhead" style={{ left: `${Math.min((currentTime / Math.max(duration, 120)) * 100, 100)}%` }}/></div><div className="timeline-foot"><span><Clock3 size={13}/>{nodes.length} 个有效节点 · 预计可压缩成 6–8 分钟</span><button onClick={() => void exportXml()}>导出 Premiere XML</button></div></div>
        </section>

        <aside className="transcript-panel"><div className="transcript-tabs"><button className="active"><MessageSquareText size={14}/>转写与节点</button><button><Bot size={14}/>AI观察</button></div><div className="transcript-tools"><label><Search size={14}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索转写内容…"/></label><button aria-label="筛选节点"><ListFilter size={15}/></button></div><div className="filter-row"><button className={nodeFilter === "全部" ? "active" : ""} onClick={() => setNodeFilter("全部")}>全部</button>{nodeKinds.map((kind) => <button key={kind} className={nodeFilter === kind ? `active kind-${kind}` : `kind-${kind}`} onClick={() => setNodeFilter(kind)}>{kind}</button>)}</div><div className="node-list">{filteredNodes.map((node) => <article key={node.id} className={activeNodeId === node.id ? "active" : ""} onClick={() => { setActiveNodeId(node.id); seekTo(node.start); }}><div className="node-time"><button>{formatTime(node.start)}</button><span>– {formatTime(node.end)}</span><em className={`kind-${node.kind}`}>{node.kind}</em></div><p contentEditable suppressContentEditableWarning onBlur={(event) => setNodes((items) => items.map((item) => item.id === node.id ? { ...item, text: event.currentTarget.textContent ?? item.text } : item))}>{node.text}</p><footer><span>{node.source}</span><b>价值 {node.score}</b></footer></article>)}</div><div className="add-node-wrap"><button className="add-node-main" onClick={() => setAddingNode(!addingNode)}><Plus size={15}/>在 {formatTime(currentTime)} 添加节点<ChevronDown size={14}/></button>{addingNode && <div className="node-menu">{nodeKinds.map((kind) => <button key={kind} className={`kind-${kind}`} onClick={() => addNode(kind)}><Tags size={13}/>{kind}</button>)}</div>}</div></aside>
      </section>
    </main>

    {newProjectOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setNewProjectOpen(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title" onMouseDown={(event) => event.stopPropagation()}><header><div><span>NEW LOCAL PROJECT</span><h2 id="new-project-title">新建本机项目</h2></div><button aria-label="关闭" onClick={() => setNewProjectOpen(false)}><X size={18}/></button></header><div className="form-stack"><label>项目名称<input autoFocus value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="例如：黑旗二创第二期"/></label><label>游戏或素材来源<input value={newProjectGame} onChange={(event) => setNewProjectGame(event.target.value)} placeholder="例如：刺客信条 IV 黑旗"/></label><p>项目数据默认保存在本机，创建后即可导入多个视频素材。</p></div><footer><button className="secondary" onClick={() => setNewProjectOpen(false)}>取消</button><button className="primary" disabled={!newProjectName.trim()} onClick={createProject}>创建项目</button></footer></section></div>}
    {settingsOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setSettingsOpen(false)}><section className="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}><header><div><span>LOCAL SETTINGS</span><h2 id="settings-title">模型与本地分析</h2></div><button aria-label="关闭" onClick={() => setSettingsOpen(false)}><X size={18}/></button></header><div className="settings-grid"><section><h3>正文创作模型</h3><label>接口类型<select value={settings.provider} onChange={(event) => setSettings((value) => ({ ...value, provider: event.target.value as AppSettings["provider"] }))}><option value="openai">OpenAI</option><option value="compatible">OpenAI 兼容接口</option></select></label><label>API 地址<input value={settings.baseUrl} onChange={(event) => setSettings((value) => ({ ...value, baseUrl: event.target.value }))}/></label><label>模型名<input value={settings.model} onChange={(event) => setSettings((value) => ({ ...value, model: event.target.value }))}/></label><label>API Key<input type="password" value={apiKeyDraft} onChange={(event) => setApiKeyDraft(event.target.value)} placeholder={settings.hasApiKey ? "已安全保存；输入可替换" : "只保存到 Windows 凭据管理器"}/></label><button className="secondary full" onClick={storeApiKey}>{settings.hasApiKey ? <Check size={14}/> : null}{settings.hasApiKey ? "已保存，点击替换" : "安全保存 Key"}</button></section><section><h3>本地语音转写</h3><label>模型<select value={settings.transcriptionModel} onChange={(event) => setSettings((value) => ({ ...value, transcriptionModel: event.target.value as AppSettings["transcriptionModel"] }))}><option value="small">Small · 快速预览</option><option value="medium">Medium · 推荐</option><option value="large-v3-turbo">Large v3 Turbo · 高精度</option></select></label><label>计算设备<select value={settings.transcriptionDevice} onChange={(event) => setSettings((value) => ({ ...value, transcriptionDevice: event.target.value as AppSettings["transcriptionDevice"] }))}><option value="auto">自动选择</option><option value="cuda">NVIDIA 显卡</option><option value="cpu">CPU</option></select></label><div className="model-state"><Gauge size={17}/><div><b>模型尚未下载</b><span>首次转写时下载；视频不会上传。</span></div></div><button className="secondary full" onClick={() => setStatus("模型下载功能将在下一阶段接通")}>管理本地模型</button></section></div><footer><span>设置只保存在当前电脑。</span><button className="primary" onClick={() => { setSettingsOpen(false); setStatus("设置已保存"); }}>完成</button></footer></section></div>}
  </div>;
}

export default App;
