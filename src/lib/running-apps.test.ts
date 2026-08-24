import { describe, expect, it } from "vitest";
import { mergeApplicationNames } from "./running-apps";

describe("mergeApplicationNames", () => {
  it("adds selected applications without duplicates", () => {
    expect(mergeApplicationNames(["steam.exe"], ["DOTA2.EXE", "steam.exe"]))
      .toEqual(["steam.exe", "dota2.exe"]);
  });

  it("ignores blank names", () => {
    expect(mergeApplicationNames([], ["", "  ", "notepad.exe"]))
      .toEqual(["notepad.exe"]);
  });
});
