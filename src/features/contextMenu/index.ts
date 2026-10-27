import { safe } from "../../core/guard";
import { log } from "../../core/log";
import { findLibraryContextMenu } from "./finder";
import type { FeatureStatus } from "../status";
import { patchContextMenu } from "./patch";

export function startContextMenu(): { status: FeatureStatus; stop: () => void } {
  const found = safe("context menu finder", findLibraryContextMenu, { ok: false, reason: "finder error" } as const);
  if (!found.ok) {
    log.warn(`context menu entry unavailable: ${found.reason}`);
    return { status: { state: "unavailable", reason: found.reason }, stop: () => {} };
  }
  const unpatch = safe("context menu patch", () => patchContextMenu(found.menuClass), null);
  if (!unpatch) return { status: { state: "unavailable", reason: "patch error" }, stop: () => {} };
  log.info("context menu entry active");
  return { status: { state: "active" }, stop: unpatch };
}
