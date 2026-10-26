import { describe, expect, it } from "vitest";
import { ITEM_KEY } from "../src/features/contextMenu/constants";
import { findAnchorIndex, insertBeforeAnchor, isAppContextMenu, removeByKey } from "../src/features/contextMenu/menuItems";
import { buildItems, loadDump } from "./helpers/fixtureTree";

const NAMES = ["steam-uninstalled", "steam-installed", "shortcut"];
const ours = () => ({ type: "MenuItem", key: ITEM_KEY, props: {} });
const keyAt = (items: unknown[], i: number) => (items[i] as { key?: unknown } | null)?.key;

describe("anchor and app-menu recognition on S0.3 fixtures", () => {
  for (const name of NAMES) {
    it(`${name}: anchor where the probe saw it, recognized as an app menu`, () => {
      const dump = loadDump(name);
      const items = buildItems(dump);
      expect(items).toHaveLength(dump.ret.childrenLen);
      expect(findAnchorIndex(items)).toBe(dump.ret.anchorIdx);
      expect(isAppContextMenu(items)).toBe(true);
    });
  }

  it("still recognizes the menu without the Properties Fragment (kiosk) through launchSource", () => {
    const items = buildItems(loadDump("steam-installed"));
    items.pop();
    expect(findAnchorIndex(items)).toBe(-1);
    expect(isAppContextMenu(items)).toBe(true);
  });

  it("ignores other menus", () => {
    const other = [{ type: "T", key: null, props: { onSelected: () => "screenshot" } }, false, "text"];
    expect(isAppContextMenu(other)).toBe(false);
    expect(isAppContextMenu([])).toBe(false);
  });
});

describe("insertBeforeAnchor", () => {
  it("goes right before the Properties Fragment, next to SteamGridDB's item", () => {
    const dump = loadDump("steam-installed");
    const items = buildItems(dump);
    const { index, anchored } = insertBeforeAnchor(items, ours());
    expect(anchored).toBe(true);
    expect(index).toBe(dump.ret.anchorIdx);
    expect(keyAt(items, index - 1)).toBe("sgdb-change-artwork");
    expect(findAnchorIndex(items)).toBe(index + 1);
  });

  it("appends at the end when there is no anchor (never splice(-1), R10)", () => {
    const items: unknown[] = [{ type: "T", key: "a", props: {} }, { type: "T", key: "b", props: {} }];
    const { index, anchored } = insertBeforeAnchor(items, ours());
    expect(anchored).toBe(false);
    expect(index).toBe(2);
    expect(keyAt(items, 2)).toBe(ITEM_KEY);
  });
});

describe("removeByKey (dedupe, 7.6)", () => {
  it("removes every copy of our item and leaves SteamGridDB's", () => {
    const items = buildItems(loadDump("steam-installed"));
    insertBeforeAnchor(items, ours());
    items.push(ours());
    removeByKey(items, ITEM_KEY);
    expect(items.some((i) => (i as { key?: unknown } | null)?.key === ITEM_KEY)).toBe(false);
    expect(items.some((i) => (i as { key?: unknown } | null)?.key === "sgdb-change-artwork")).toBe(true);
  });

  it("repeated passes keep exactly one item (render + two updates, S0.4)", () => {
    const items = buildItems(loadDump("steam-uninstalled"));
    for (let pass = 0; pass < 3; pass++) {
      removeByKey(items, ITEM_KEY);
      insertBeforeAnchor(items, ours());
    }
    expect(items.filter((i) => (i as { key?: unknown } | null)?.key === ITEM_KEY)).toHaveLength(1);
  });
});
