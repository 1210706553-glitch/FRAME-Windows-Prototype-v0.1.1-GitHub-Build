import { describe, expect, it } from "vitest";
import { clampTime, formatTime, parseFps } from "./time";

describe("time helpers", () => {
  it("formats minute and hour timestamps", () => {
    expect(formatTime(67.8)).toBe("01:07");
    expect(formatTime(3661)).toBe("01:01:01");
  });

  it("parses ffprobe frame rates", () => {
    expect(parseFps("60000/1001")).toBe(59.94);
    expect(parseFps("30")).toBe(30);
  });

  it("keeps seeking inside media bounds", () => {
    expect(clampTime(-4, 100)).toBe(0);
    expect(clampTime(120, 100)).toBe(100);
  });
});
