export type ProjectStage = "素材整理" | "方向发散" | "主线设计" | "大纲" | "脚本" | "审阅";

export type Project = {
  id: string;
  name: string;
  game: string;
  stage: ProjectStage;
  updatedAt: string;
  mediaCount: number;
};

export type MediaItem = {
  id: string;
  projectId: string;
  name: string;
  path: string;
  previewUrl: string;
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  size?: number;
  status: "ready" | "probing" | "transcribing" | "error";
};

export type MaterialNodeKind = "笑点" | "信息" | "情绪" | "过场" | "删除候选";

export type MaterialNode = {
  id: string;
  mediaId: string;
  start: number;
  end: number;
  text: string;
  kind: MaterialNodeKind;
  score: number;
  source: "人工" | "本地转写" | "AI分析";
};

export type MediaProbe = {
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  size?: number;
  audioTracks: number;
  formatName?: string;
};

export type AppSettings = {
  provider: "openai" | "compatible";
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  transcriptionModel: "small" | "medium" | "large-v3-turbo";
  transcriptionDevice: "auto" | "cuda" | "cpu";
};
