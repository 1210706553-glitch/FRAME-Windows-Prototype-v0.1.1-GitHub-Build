import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Mickey Toolkit renderer error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32, background: "#090c12", color: "#f4f6fb", fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif' }}>
        <section style={{ width: "min(620px, 100%)", border: "1px solid #354158", borderRadius: 14, padding: 24, background: "#141a25" }}>
          <div style={{ color: "#ec7b86", fontSize: 12, fontWeight: 700 }}>界面运行错误</div>
          <h1 style={{ margin: "8px 0", fontSize: 22 }}>软件没有丢失项目，请重新启动</h1>
          <p style={{ color: "#b5bece", lineHeight: 1.7 }}>已阻止页面直接变成黑屏。请拍下下面的错误信息发给开发者。</p>
          <pre style={{ overflow: "auto", borderRadius: 8, padding: 12, background: "#090c12", color: "#ecb7bc", whiteSpace: "pre-wrap" }}>{this.state.error.message}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 12, border: 0, borderRadius: 8, padding: "9px 14px", background: "#6c5ce7", color: "white", cursor: "pointer" }}>重新加载界面</button>
        </section>
      </main>
    );
  }
}
