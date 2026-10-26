import { fakeRenderComponent, findModuleByExport } from "@decky/ui";
import { LIBRARY_CONTEXT_MENU_MARKER, NAVIGATOR_MARKER } from "./constants";

export type FindResult = { ok: true; menuClass: any } | { ok: false; reason: string };

function sourceIncludes(value: unknown, marker: string): boolean {
  try {
    return typeof value === "function" && Function.prototype.toString.call(value).includes(marker);
  } catch {
    return false;
  }
}

// Locates the LibraryContextMenu class (design 7.2). Any missing step marks
// Feature A unavailable with a reason the panel shows.
export function findLibraryContextMenu(): FindResult {
  const mod = findModuleByExport((e) => sourceIncludes(e, LIBRARY_CONTEXT_MENU_MARKER));
  if (!mod) return { ok: false, reason: "module not found" };
  const wrapper = Object.values(mod).find((x) => sourceIncludes(x, NAVIGATOR_MARKER));
  if (typeof wrapper !== "function") return { ok: false, reason: "menu wrapper not found" };
  const menuClass = fakeRenderComponent(wrapper)?.type;
  if (typeof menuClass?.prototype?.render !== "function") return { ok: false, reason: "menu class not found" };
  // Cheap sanity check that this is the app menu class (S0.2).
  if (typeof menuClass.prototype.GetTargetApps !== "function") return { ok: false, reason: "unexpected menu class" };
  return { ok: true, menuClass };
}
