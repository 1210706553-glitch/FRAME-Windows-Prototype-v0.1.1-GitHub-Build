import type { FocusStatus } from "../types";

export function shouldRunAppGuard(status: FocusStatus): boolean {
  return status === "active";
}
