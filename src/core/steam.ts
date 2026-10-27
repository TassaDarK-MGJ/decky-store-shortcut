import { getReactInstance } from "@decky/ui";
import type { FiberLike } from "./appid";
import type { AppOverviewLike } from "./steamTypes";

// Live Steam lookups shared by the features. They stay out of core/appid.ts so the
// resolver remains pure and testable without Steam.
export function lookupOverview(appid: number): AppOverviewLike | null {
  return window.appStore?.GetAppOverviewByAppID?.(appid) ?? null;
}

// Gamepad UI elements belong to another window (another JS realm), so `instanceof`
// checks against this context's classes are always false for them: test the shape.
export function fiberOf(element: unknown): FiberLike | null {
  if (!element || typeof element !== "object") return null;
  return (getReactInstance(element as HTMLElement) as FiberLike | undefined) ?? null;
}
