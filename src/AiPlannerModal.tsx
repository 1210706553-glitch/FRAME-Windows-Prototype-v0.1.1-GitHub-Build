import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, FileText, KeyRound, RefreshCw, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import { analyzeSubtitles, deleteDeepSeekApiKey, readDeepSeekKeyStatus, saveDeepSeekApiKey, type DeepSeekKeyStatus } from "./lib/deepseek";
import { normalizeSubtitleText, subtitleFileError, subtitleTextError } from "./lib/subtitles";
import type { AiPlanningResult, AiSuggestedTask, ProjectAnalysis, ProjectPlan } from "./types";

type Step = "source" | "results";

interface AiPlannerModalProps {
  project: ProjectPlan;
  onClose: () => void;
  onConfirm: (analysis: ProjectAnalysis) => void;
}

const resultSections: Array<{ key: keyof Pick<AiPlanningResult, "materialOrganization" | "roughCutPlan" | "videoOutline">; title: string; stage: AiSuggestedTask["stage"] }> = [
  { key: "materialOrganization", title: "1 · 素材梳理", stage: "素材梳理" },
  { key: "roughCutPlan", title: "2 · 粗剪规划", stage: "粗剪" },
  { key: "videoOutline", title: "3 · 视频大纲", stage: "大纲" },
];

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function AiPlannerModal({ project, onClose, onConfirm }: AiPlannerModalProps) {
  const existing = project.analysis;
  const [step, setStep] = useState<Step>(existing ? "results" : "source");
  const [sourceFileName, setSourceFileName] = useState(existing?.sourceFileName ?? "");
  const [transcriptText, setTranscriptText] = useState(existing?.transcriptText ?? "");
  const [result, setResult] = useState<AiPlanningResult | null>(existing?.result ?? null);
  const [keyStatus, setKeyStatus] = useState<DeepSeekKeyStatus | null>(null);
  const [keyEditorOpen, setKeyEditorOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    readDeepSeekKeyStatus()
      .then((status) => {
        if (!cancelled) {
          setKeyStatus(status);
          setKeyEditorOpen(!status.configured);
        }
      })
      .catch((reason) => !cancelled && setError(messageFrom(reason)));
    return () => { cancelled = true; };
  }, []);

  async function selectFile(file?: File) {
    if (!file) return;
    setError("");
    const fileError = subtitleFileError(file.name, file.size);
    if (fileError) {
      setError(fileError);
      return;
    }
    try {
      const text = normalizeSubtitleText(await file.text());
      const textError = subtitleTextError(text);
      if (textError) {
        setError(textError);
        return;
      }
      setSourceFileName(file.name);
      setTranscriptText(text);
      setResult(null);
      setStep("source");
    } catch {
      setError("字幕文件读取失败，请重新选择");
    }
  }

  async function saveKey() {
    if (!apiKey.trim()) {
      setError("请粘贴 DeepSeek API Key");
      return;
    }
    setSavingKey(true);
    setError("");
    try {
      await saveDeepSeekApiKey(apiKey);
      setApiKey("");
      setKeyStatus({ native: true, configured: true });
      setKeyEditorOpen(false);
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setSavingKey(false);
    }
  }

  async function clearKey() {
    if (!window.confirm("确定从这台电脑删除 DeepSeek API Key 吗？")) return;
    setSavingKey(true);
    setError("");
    try {
      await deleteDeepSeekApiKey();
      setKeyStatus({ native: true, configured: false });
      setKeyEditorOpen(true);
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setSavingKey(false);
    }
  }

  async function startAnalysis() {
    const normalized = normalizeSubtitleText(transcriptText);
    const textError = subtitleTextError(normalized);
    if (textError) {
      setError(textError);
      return;
    }
    if (!keyStatus?.configured) {
      setKeyEditorOpen(true);
      setError("请先配置 DeepSeek API Key");
      return;
    }
    setLoading(true);
    setError("");
    setTranscriptText(normalized);
    try {
      setResult(await analyzeSubtitles({
        projectName: project.name,
        game: project.game,
        platform: project.primaryPlatform,
        transcriptText: normalized,
      }));
      setStep("results");
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setLoading(false);
    }
  }

  function updateResultText(key: "materialOrganization" | "roughCutPlan" | "videoOutline", value: string) {
    setResult((current) => current ? { ...current, [key]: value } : current);
  }

  function updateTask(index: number, patch: Partial<AiSuggestedTask>) {
    setResult((current) => current ? {
      ...current,
      tasks: current.tasks.map((task, taskIndex) => taskIndex === index ? { ...task, ...patch } : task),
    } : current);
  }

  const hasEveryStage = resultSections.every(({ stage }) => result?.tasks.some((task) => task.stage === stage && task.title.trim()));
  const resultComplete = Boolean(result
    && result.materialOrganization.trim()
    && result.roughCutPlan.trim()
    && result.videoOutline.trim()
    && hasEveryStage);

  function confirm() {
    if (!result || !resultComplete) {
      setError("三份结果和三个阶段的任务都必须保留至少一项");
      return;
    }
    onConfirm({
      sourceFileName: sourceFileName || "手动粘贴.txt",
      transcriptText: normalizeSubtitleText(transcriptText),
      result,
      analyzedAt: new Date().toISOString(),
    });
  }

  return <div className="modal-backdrop ai-planner-backdrop" onMouseDown={() => !loading && onClose()}>
    <section className="modal ai-planner-modal" role="dialog" aria-modal="true" aria-labelledby="ai-planner-title" onMouseDown={(event) => event.stopPropagation()}>
      <header>
        <div><span>DEEPSEEK · FIRST 3 STAGES</span><h2 id="ai-planner-title">AI梳理前三阶段</h2></div>
        <button aria-label="关闭" disabled={loading} onClick={onClose}><X size={18} /></button>
      </header>

      <div className="ai-planner-steps" aria-label="处理步骤">
        <span className={step === "source" ? "active" : "done"}><i>1</i>字幕预览</span>
        <span className={step === "results" ? "active" : ""}><i>2</i>结果与任务</span>
      </div>

      {step === "source" && <div className="ai-source-body">
        <section className="ai-key-card">
          <div><ShieldCheck size={17} /><span><strong>{keyStatus?.configured ? "DeepSeek 已配置" : keyStatus?.native === false ? "浏览器预览不可调用 DeepSeek" : "配置 DeepSeek API Key"}</strong><small>{keyStatus?.configured ? "密钥保存在 Windows 凭据管理器，不写入项目数据。" : "每个人填写自己的密钥，只保存在当前电脑。"}</small></span></div>
          {keyStatus?.configured && !keyEditorOpen && <div className="ai-key-actions"><button type="button" onClick={() => setKeyEditorOpen(true)}><KeyRound size={14} />更换密钥</button><button type="button" disabled={savingKey} onClick={() => void clearKey()}>清除</button></div>}
          {keyEditorOpen && <div className="ai-key-editor"><input type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="粘贴 DeepSeek API Key" /><button type="button" disabled={savingKey || keyStatus?.native === false} onClick={() => void saveKey()}>{savingKey ? <RefreshCw className="spinning" size={14} /> : <Check size={14} />}保存</button></div>}
        </section>

        <section className="ai-file-card">
          <input ref={fileInputRef} hidden type="file" accept=".srt,.txt,text/plain,application/x-subrip" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void selectFile(file); }} />
          <div className="ai-file-heading"><div><FileText size={18} /><span><strong>{sourceFileName || "导入 SRT / TXT 字幕"}</strong><small>选择后只在本地预览，不会自动发送。</small></span></div><button type="button" onClick={() => fileInputRef.current?.click()}><Upload size={14} />{sourceFileName ? "重新选择" : "选择文件"}</button></div>
          <textarea value={transcriptText} onChange={(event) => setTranscriptText(event.target.value)} placeholder="选择字幕文件后可在这里删掉无关内容，也可以直接粘贴字幕文本。" />
          <footer><span>{transcriptText.length.toLocaleString("zh-CN")} / 300,000 字</span><span>只会产生一次分析请求</span></footer>
        </section>
      </div>}

      {step === "results" && result && <div className="ai-results-body">
        <div className="ai-results-note"><Sparkles size={16} /><span>三份内容和下面的任务都可以修改；确认后只替换尚未完成的前三阶段任务。</span></div>
        {resultSections.map((section) => <section className="ai-result-section" key={section.key}>
          <header><strong>{section.title}</strong><span>{result.tasks.filter((task) => task.stage === section.stage).length}项任务</span></header>
          <textarea value={result[section.key]} onChange={(event) => updateResultText(section.key, event.target.value)} />
          <div className="ai-task-editor">
            {result.tasks.map((task, index) => task.stage === section.stage && <div className="ai-task-edit-row" key={`${task.stage}-${index}`}>
              <input aria-label={`${task.stage}任务标题`} value={task.title} onChange={(event) => updateTask(index, { title: event.target.value })} />
              <input aria-label={`${task.stage}完成标准`} value={task.note} onChange={(event) => updateTask(index, { note: event.target.value })} />
              <label><input type="number" min={15} max={120} step={5} value={task.estimateMinutes} onChange={(event) => updateTask(index, { estimateMinutes: Math.min(120, Math.max(15, Number(event.target.value) || 15)) })} /><span>分钟</span></label>
            </div>)}
          </div>
        </section>)}
      </div>}

      {error && <div className="ai-planner-error" role="alert">{error}</div>}

      <footer>
        <div>{step === "results" && <button className="button secondary" type="button" onClick={() => setStep("source")}><ArrowLeft size={15} />返回字幕</button>}</div>
        <div>
          <button className="button secondary" type="button" disabled={loading} onClick={onClose}>取消</button>
          {step === "source"
            ? <button className="button primary" type="button" disabled={loading || !transcriptText.trim() || keyStatus?.native === false} onClick={() => void startAnalysis()}>{loading ? <><RefreshCw className="spinning" size={15} />正在分析，请勿关闭</> : <><Sparkles size={15} />开始一次分析</>}</button>
            : <button className="button primary" type="button" disabled={!resultComplete} onClick={confirm}><Check size={15} />确认并生成每日任务</button>}
        </div>
      </footer>
    </section>
  </div>;
}
