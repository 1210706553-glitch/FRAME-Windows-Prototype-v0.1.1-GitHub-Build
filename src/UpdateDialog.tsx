import { Download, RefreshCw, ShieldCheck, X } from "lucide-react";
import type { AvailableAppUpdate } from "./lib/app-updater";

export type UpdateDialogPhase = "checking" | "available" | "downloading" | "installing" | "error";

interface UpdateDialogProps {
  update: AvailableAppUpdate;
  phase: UpdateDialogPhase;
  percent?: number;
  error?: string;
  onInstall: () => void;
  onRetry: () => void;
  onClose: () => void;
}

function releaseDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("zh-CN");
}

export default function UpdateDialog({ update, phase, percent, error, onInstall, onRetry, onClose }: UpdateDialogProps) {
  const busy = phase === "checking" || phase === "downloading" || phase === "installing";
  const date = releaseDate(update.date);
  const progressKnown = typeof percent === "number";
  return <div className="modal-backdrop update-backdrop" onMouseDown={() => { if (!busy) onClose(); }}>
    <section className="modal update-modal" role="dialog" aria-modal="true" aria-labelledby="update-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
      <header>
        <div><span>SECURE UPDATE</span><h2 id="update-dialog-title">{phase === "checking" ? "正在重新检查更新" : phase === "error" ? "更新没有完成" : `发现新版本 v${update.version}`}</h2></div>
        <button aria-label="稍后再说" disabled={busy} onClick={onClose}><X size={18} /></button>
      </header>
      <div className="update-dialog-body">
        <div className="update-version-row"><span>当前 v{update.currentVersion}</span><i /> <strong>新版 v{update.version}</strong>{date && <em>{date}</em>}</div>
        {phase === "available" && <>
          <div className="update-trust"><ShieldCheck size={18} /><div><strong>已启用更新签名验证</strong><span>只有由本项目签名的正式安装包才能被安装。</span></div></div>
          <div className="update-notes"><span>本次更新</span><p>{update.body?.trim() || "修复问题并改进使用体验。"}</p></div>
        </>}
        {busy && <div className="update-progress-block">
          <div><span>{phase === "checking" ? "正在确认最新正式版本" : phase === "installing" ? "正在安装，软件即将重启" : "正在下载更新"}</span><strong>{progressKnown ? `${percent}%` : "请稍候"}</strong></div>
          <div className={`update-progress ${progressKnown ? "" : "indeterminate"}`}><i style={progressKnown ? { transform: `scaleX(${percent / 100})` } : undefined} /></div>
          <small>{phase === "checking" ? "通常只需要几秒钟。" : "请不要关闭软件。Windows 安装程序可能会短暂出现。"}</small>
        </div>}
        {phase === "error" && <div className="update-error"><span>{error}</span><small>当前版本仍可正常使用，没有被替换。</small></div>}
      </div>
      <footer>
        <span>{phase === "checking" ? "正在连接正式更新源" : busy ? "安装完成后会自动重启" : "可稍后在设置中再次检查"}</span>
        <div>
          {!busy && <button className="button secondary" onClick={onClose}>稍后再说</button>}
          {phase === "available" && <button className="button primary" onClick={onInstall}><Download size={16} />下载并安装</button>}
          {phase === "error" && <button className="button primary" onClick={onRetry}><RefreshCw size={16} />重新检查</button>}
        </div>
      </footer>
    </section>
  </div>;
}
