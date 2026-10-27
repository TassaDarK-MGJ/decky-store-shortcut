// Single source of truth for the appid (design 5). Pure functions: Steam data comes
// in as arguments, so the resolver runs against the S0.3/S0.4 fixtures in tests.
import { EAppType, type AppOverviewLike, type OverviewLookup } from "./steamTypes";

export interface ResolvedApp {
  appid: number;
  overview: AppOverviewLike;
}

const MAX_DEPTH = 24;

// Strategy 1 (5.2): an object with a numeric .app.appid, walking only `props` and
// `children` (React trees are cyclic through _owner and friends).
export function findAppAppId(node: unknown, depth = 0): number | null {
  if (!node || typeof node !== "object" || depth > MAX_DEPTH) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findAppAppId(child, depth + 1);
      if (found != null) return found;
    }
    return null;
  }
  const obj = node as { app?: { appid?: unknown }; props?: unknown; children?: unknown };
  if (typeof obj.app?.appid === "number") return obj.app.appid;
  return findAppAppId(obj.props, depth + 1) ?? findAppAppId(obj.children, depth + 1);
}

// Strategy 2 (5.2): older client shape, element._owner.pendingProps.overview.appid.
// Always null on build 1792618285 (S0.3), kept as a fallback for other builds.
export function findOwnerAppId(items: readonly unknown[]): number | null {
  for (const item of items) {
    const appid = (item as { _owner?: { pendingProps?: { overview?: { appid?: unknown } } } } | null)?._owner
      ?.pendingProps?.overview?.appid;
    if (typeof appid === "number") return appid;
  }
  return null;
}

// Common validation (5.4). Returns the live overview, or null when the app has no
// store page (shortcut, mod, invalid) or the data does not match.
export function validateAppId(appid: unknown, lookup: OverviewLookup): AppOverviewLike | null {
  if (typeof appid !== "number" || !Number.isInteger(appid) || appid <= 0) return null;
  const overview = lookup(appid);
  if (!overview || overview.appid !== appid) return null;
  if (overview.app_type === EAppType.Invalid || overview.app_type === EAppType.Shortcut) return null;
  if (typeof overview.BIsModOrShortcut === "function" && overview.BIsModOrShortcut()) return null;
  return overview;
}

// Feature B (5.3, S0.5): React fiber, reduced to what the resolver walks.
export interface FiberLike {
  memoizedProps?: unknown;
  return?: FiberLike | null;
}

// On build 1792618285 the focused capsule's component sits 10 levels above its element
// with props.app.appid, in Home and every Library tab. Stopping at 11 keeps out the
// context menu (overview only, 12–13 levels up) and the page containers above.
export const MAX_FIBER_DEPTH = 11;

// The raw appid of the capsule a fiber belongs to, before validation, so a caller can
// tell "not a capsule" (null) from "capsule without a store page" (validation fails).
export function findCapsuleAppId(fiber: FiberLike | null | undefined): number | null {
  let f = fiber;
  for (let depth = 0; f && depth <= MAX_FIBER_DEPTH; depth++, f = f.return) {
    const appid = (f.memoizedProps as { app?: { appid?: unknown } } | null | undefined)?.app?.appid;
    if (typeof appid === "number") return appid;
  }
  return null;
}

// Feature B entry point (5.1): the focused element (footer node or button event target).
export function fromElement(
  element: unknown,
  fiberOf: (element: unknown) => FiberLike | null | undefined,
  lookup: OverviewLookup,
): ResolvedApp | null {
  if (!element) return null;
  const appid = findCapsuleAppId(fiberOf(element));
  if (appid == null) return null;
  const overview = validateAppId(appid, lookup);
  return overview ? { appid, overview } : null;
}

// Feature A entry point (5.1). `items` is the menu's item array for the pass being
// rendered now; `hint` is the outer render's this.props.overview.appid when that
// array came from it. The appid is derived on every pass and never cached (5.2).
export function fromContextMenu(items: readonly unknown[], hint: number | null, lookup: OverviewLookup): ResolvedApp | null {
  const appid = findAppAppId(items) ?? findOwnerAppId(items) ?? hint;
  if (appid == null) return null;
  const overview = validateAppId(appid, lookup);
  return overview ? { appid, overview } : null;
}
