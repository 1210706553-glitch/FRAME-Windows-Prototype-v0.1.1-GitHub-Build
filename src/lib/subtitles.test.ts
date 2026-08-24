import { describe, expect, it } from "vitest";
import {
  MAX_SUBTITLE_FILE_BYTES,
  MAX_SUBTITLE_CHARACTERS,
  normalizeSubtitleText,
  subtitleFileError,
  subtitleTextError,
} from "./subtitles";

describe("subtitle ingestion", () => {
  it("accepts SRT and TXT regardless of extension case", () => {
    expect(subtitleFileError("episode.SRT", 128)).toBeNull();
    expect(subtitleFileError("notes.txt", 128)).toBeNull();
  });

  it("rejects unsupported and oversized files", () => {
    expect(subtitleFileError("video.mp4", 128)).toContain("SRT");
    expect(subtitleFileError("large.srt", MAX_SUBTITLE_FILE_BYTES + 1)).toContain("3 MB");
  });

  it("normalizes BOM and line endings without removing timestamps", () => {
    const input = "\uFEFF1\r\n00:00:01,000 --> 00:00:03,000\r\n开场  \r\n\r\n";
    expect(normalizeSubtitleText(input)).toBe("1\n00:00:01,000 --> 00:00:03,000\n开场");
  });

  it("rejects empty or excessively long text", () => {
    expect(subtitleTextError(" \n ")).toContain("为空");
    expect(subtitleTextError("字".repeat(MAX_SUBTITLE_CHARACTERS + 1))).toContain("超过");
  });
});
