// Pure operations on the context menu's item array (design 7.4, 7.5). No Steam or
// Decky imports, so they run against the S0.3 fixtures in tests.
import { APP_PROPERTIES_MARKER, LAUNCH_SOURCE_MARKER } from "./constants";

interface ElementLike {
  key?: unknown;
  props?: { onSelected?: unknown; children?: unknown };
}

const MAX_DEPTH = 24;

function asElement(node: unknown): ElementLike | null {
  return node && typeof node === "object" && !Array.isArray(node) ? (node as ElementLike) : null;
}

function handlerIncludes(node: unknown, marker: string): boolean {
  const fn = asElement(node)?.props?.onSelected;
  if (typeof fn !== "function") return false;
  try {
    return Function.prototype.toString.call(fn).includes(marker);
  } catch {
    return false;
  }
}

function childList(node: unknown): unknown[] {
  const children = asElement(node)?.props?.children;
  if (children == null) return [];
  return Array.isArray(children) ? children : [children];
}

function anyInTree(node: unknown, test: (n: unknown) => boolean, depth = 0): boolean {
  if (depth > MAX_DEPTH || node == null || typeof node !== "object") return false;
  if (Array.isArray(node)) return node.some((n) => anyInTree(n, test, depth + 1));
  return test(node) || childList(node).some((n) => anyInTree(n, test, depth + 1));
}

// The "Properties…" item, either as a direct child or inside the Fragment that
// holds [separator, Properties] (one level down, 7.5).
export function isAnchor(node: unknown): boolean {
  return handlerIncludes(node, APP_PROPERTIES_MARKER) || childList(node).some((c) => handlerIncludes(c, APP_PROPERTIES_MARKER));
}

export function findAnchorIndex(items: readonly unknown[]): number {
  return items.findIndex(isAnchor);
}

// The inner menu component is shared by every Steam menu (7.4): only touch arrays
// that hold the Properties anchor or a native handler using launchSource.
export function isAppContextMenu(items: readonly unknown[]): boolean {
  return findAnchorIndex(items) >= 0 || anyInTree(items, (n) => handlerIncludes(n, LAUNCH_SOURCE_MARKER));
}

export function removeByKey(items: unknown[], key: string): void {
  for (let i = items.length - 1; i >= 0; i--) {
    if (asElement(items[i])?.key === key) items.splice(i, 1);
  }
}

// Inserts just before the Properties Fragment; without an anchor (kiosk mode, or
// an unknown shape) appends at the end instead of splice(-1) (R10).
// Returns the index used and whether the anchor was found.
export function insertBeforeAnchor(items: unknown[], item: unknown): { index: number; anchored: boolean } {
  const anchor = findAnchorIndex(items);
  const index = anchor >= 0 ? anchor : items.length;
  items.splice(index, 0, item);
  return { index, anchored: anchor >= 0 };
}
