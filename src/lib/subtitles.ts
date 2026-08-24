export const MAX_SUBTITLE_FILE_BYTES = 3 * 1024 * 1024;
export const MAX_SUBTITLE_CHARACTERS = 300_000;

const SUPPORTED_EXTENSIONS = [".srt", ".txt"];

export function subtitleFileError(fileName: string, fileSize: number): string | null {
  const lowerName = fileName.trim().toLowerCase();
  if (!SUPPORTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    return "只支持 SRT 或 TXT 字幕文件";
  }
  if (fileSize > MAX_SUBTITLE_FILE_BYTES) {
    return "字幕文件超过 3 MB，请先精简后再导入";
  }
  return null;
}

export function normalizeSubtitleText(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function subtitleTextError(value: string): string | null {
  const normalized = normalizeSubtitleText(value);
  if (!normalized) return "字幕内容为空，请重新选择文件";
  if (normalized.length > MAX_SUBTITLE_CHARACTERS) {
    return `字幕内容超过 ${MAX_SUBTITLE_CHARACTERS.toLocaleString("zh-CN")} 字，请先删减后再分析`;
  }
  return null;
}
