import { invoke } from "@tauri-apps/api/core";
import type { AiPlanningResult } from "../types";

export interface DeepSeekKeyStatus {
  native: boolean;
  configured: boolean;
}

export interface DeepSeekAnalysisRequest {
  projectName: string;
  game: string;
  platform: string;
  transcriptText: string;
}

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function readDeepSeekKeyStatus(): Promise<DeepSeekKeyStatus> {
  if (!isTauriRuntime()) return { native: false, configured: false };
  try {
    return { native: true, configured: await invoke<boolean>("deepseek_key_status") };
  } catch (error) {
    throw new Error(errorMessage(error));
  }
}

export async function saveDeepSeekApiKey(apiKey: string): Promise<void> {
  if (!isTauriRuntime()) throw new Error("请在 Windows 桌面版中配置 DeepSeek");
  try {
    await invoke("save_deepseek_api_key", { apiKey });
  } catch (error) {
    throw new Error(errorMessage(error));
  }
}

export async function deleteDeepSeekApiKey(): Promise<void> {
  if (!isTauriRuntime()) throw new Error("请在 Windows 桌面版中配置 DeepSeek");
  try {
    await invoke("delete_deepseek_api_key");
  } catch (error) {
    throw new Error(errorMessage(error));
  }
}

export async function analyzeSubtitles(request: DeepSeekAnalysisRequest): Promise<AiPlanningResult> {
  if (!isTauriRuntime()) throw new Error("字幕分析只能在 Windows 桌面版中运行");
  try {
    return await invoke<AiPlanningResult>("analyze_subtitles", { request });
  } catch (error) {
    throw new Error(errorMessage(error));
  }
}
