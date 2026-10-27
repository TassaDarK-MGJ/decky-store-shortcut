import { describe, expect, it } from "vitest";
import { findCapsuleAppId, fromElement, MAX_FIBER_DEPTH, type FiberLike } from "../src/core/appid";
import { EAppType, type AppOverviewLike } from "../src/core/steamTypes";
import { NAV_BUTTON } from "../src/features/buttonShortcut/constants";
import { createDebounce, isShortcutPress, withFooterHint } from "../src/features/buttonShortcut/logic";

// Fiber chains shaped like the S0.5 recordings (build 1792618285): `props` maps a depth
// to the memoizedProps found there; every other level has unrelated props.
function chain(length: number, props: Record<number, unknown>): FiberLike {
  let fiber: FiberLike | null = null;
  for (let depth = length - 1; depth >= 0; depth--) fiber = { memoizedProps: props[depth] ?? { className: "x" }, return: fiber };
  return fiber!;
}

const HOME_CAPSULE = chain(40, {
  10: { app: { appid: 620 }, bFeatured: false, bPrefer2xImage: true, bShowFriendsAsIcons: false },
  20: { appid: 620, bFeatured: false, bShortLayout: false, label: "x" },
});
const GRID_CAPSULE = chain(40, { 10: { app: { appid: 620 }, navRef: {}, strCollectionId: "type-games" } });
const CONTEXT_MENU_ITEM = chain(40, {
  12: { navigator: {}, instance: {}, overview: { appid: 620 }, client: {} },
  13: { overview: { appid: 620 }, client: {}, launchSource: 0, bInGamepadUI: true },
});
const LIBRARY_TAB = chain(40, {});

const steam = (appid: number): AppOverviewLike => ({ appid, app_type: 1, BIsModOrShortcut: () => false });
const shortcut = (appid: number): AppOverviewLike => ({ appid, app_type: EAppType.Shortcut, BIsModOrShortcut: () => true });
const lookupOf = (...apps: AppOverviewLike[]) => (id: number) => apps.find((a) => a.appid === id) ?? null;

describe("findCapsuleAppId (5.3, S0.5)", () => {
  it("finds app.appid 10 levels up in Home and in the Library grid", () => {
    expect(findCapsuleAppId(HOME_CAPSULE)).toBe(620);
    expect(findCapsuleAppId(GRID_CAPSULE)).toBe(620);
  });
  it("ignores the context menu, which only carries overview", () => {
    expect(findCapsuleAppId(CONTEXT_MENU_ITEM)).toBeNull();
  });
  it("ignores non-capsules and a bare appid higher up", () => {
    expect(findCapsuleAppId(LIBRARY_TAB)).toBeNull();
    expect(findCapsuleAppId(chain(40, { 20: { appid: 620 } }))).toBeNull();
    expect(findCapsuleAppId(null)).toBeNull();
  });
  it("stops at MAX_FIBER_DEPTH", () => {
    expect(findCapsuleAppId(chain(40, { [MAX_FIBER_DEPTH]: { app: { appid: 7 } } }))).toBe(7);
    expect(findCapsuleAppId(chain(40, { [MAX_FIBER_DEPTH + 1]: { app: { appid: 7 } } }))).toBeNull();
  });
});

describe("fromElement (5.1, 5.4)", () => {
  const fiberOf = (el: unknown) => el as FiberLike;
  it("resolves a Steam game", () => {
    expect(fromElement(GRID_CAPSULE, fiberOf, lookupOf(steam(620)))?.appid).toBe(620);
  });
  it("rejects a non-Steam shortcut and unknown apps", () => {
    expect(fromElement(GRID_CAPSULE, fiberOf, lookupOf(shortcut(620)))).toBeNull();
    expect(fromElement(GRID_CAPSULE, fiberOf, lookupOf())).toBeNull();
  });
  it("returns null without an element", () => {
    expect(fromElement(null, fiberOf, lookupOf(steam(620)))).toBeNull();
  });
});

describe("isShortcutPress (8.3)", () => {
  it("accepts the first press of the configured button only", () => {
    expect(isShortcutPress({ button: NAV_BUTTON.l3 }, "l3")).toBe(true);
    expect(isShortcutPress({ button: NAV_BUTTON.r3, is_repeat: false }, "r3")).toBe(true);
    expect(isShortcutPress({ button: NAV_BUTTON.r3 }, "l3")).toBe(false);
    expect(isShortcutPress({ button: NAV_BUTTON.l3, is_repeat: true }, "l3")).toBe(false);
  });
  it("does nothing when turned off or without details", () => {
    expect(isShortcutPress({ button: NAV_BUTTON.l3 }, "off")).toBe(false);
    expect(isShortcutPress(undefined, "l3")).toBe(false);
  });
});

describe("createDebounce", () => {
  it("lets one call through per window", () => {
    let now = 1000;
    const ok = createDebounce(400, () => now);
    expect(ok()).toBe(true);
    now = 1399;
    expect(ok()).toBe(false);
    now = 1400;
    expect(ok()).toBe(true);
  });
});

describe("withFooterHint (8.4 F4)", () => {
  it("adds the entry without touching the existing ones", () => {
    const map = { 0: "Select", 1: "Back" };
    expect(withFooterHint(map, 17, "Store page")).toEqual({ 0: "Select", 1: "Back", 17: "Store page" });
    expect(map).toEqual({ 0: "Select", 1: "Back" });
  });
  it("accepts a missing map", () => {
    expect(withFooterHint(undefined, 19, "Store page")).toEqual({ 19: "Store page" });
  });
});
