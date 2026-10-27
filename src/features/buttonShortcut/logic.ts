// Pure decisions of Feature B, kept free of @decky/ui so they run in unit tests.
import type { ShortcutButton } from "../../settings/schema";
import { NAV_BUTTON } from "./constants";

export interface ButtonDetail {
  button?: number;
  is_repeat?: boolean;
}

// Only the first press of the configured button counts (8.3).
export function isShortcutPress(detail: ButtonDetail | null | undefined, setting: ShortcutButton): boolean {
  if (setting === "off" || !detail || detail.is_repeat) return false;
  return detail.button === NAV_BUTTON[setting];
}

export function createDebounce(ms: number, now: () => number = Date.now): () => boolean {
  let last = -Infinity;
  return () => {
    const t = now();
    if (t - last < ms) return false;
    last = t;
    return true;
  };
}

// The footer map with our entry added; the store drops it by itself on the next
// focus change because SetActionsFromMap removes keys missing from the new map.
export function withFooterHint<T>(map: Record<number, T> | null | undefined, footerButton: number, label: T): Record<number, T> {
  return { ...(map ?? {}), [footerButton]: label };
}
