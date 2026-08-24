import { describe, expect, it } from "vitest";
import { calculateDownloadPercent, toUpdateErrorMessage } from "./app-updater";

describe("app updater helpers", () => {
  it("calculates and clamps known download progress", () => {
    expect(calculateDownloadPercent(25, 100)).toBe(25);
    expect(calculateDownloadPercent(130, 100)).toBe(100);
    expect(calculateDownloadPercent(10)).toBeUndefined();
  });

  it("turns technical updater failures into safe Chinese messages", () => {
    expect(toUpdateErrorMessage(new Error("signature verify failed"))).toContain("签名验证失败");
    expect(toUpdateErrorMessage(new Error("request timeout"))).toContain("超时");
    expect(toUpdateErrorMessage(new Error("404 Not Found"))).toContain("没有找到");
  });
});
