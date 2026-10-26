import { safe } from "../../core/guard";
import { log } from "../../core/log";
import { findLibraryContextMenu } from "./finder";
import { patchContextMenu } from "./patch";

export type FeatureStatus = { state: "active" } | { state: "unavailable"; reason: string };

// Self-diagnosis (design 10): the result is shown in the panel, so a Steam update
// that breaks the finder is visible instead of failing silently.
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
