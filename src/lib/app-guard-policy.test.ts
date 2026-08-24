import { describe, expect, it } from "vitest";
import { shouldRunAppGuard } from "./app-guard-policy";

describe("application guard policy", () => {
  it("runs only during an active focus session", () => {
    expect(shouldRunAppGuard("active")).toBe(true);
    expect(shouldRunAppGuard("temporary-unlock")).toBe(false);
    expect(shouldRunAppGuard("idle")).toBe(false);
  });
});
