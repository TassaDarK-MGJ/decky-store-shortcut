import { describe, expect, it } from "vitest";
import { findAppAppId, findOwnerAppId, fromContextMenu, validateAppId } from "../src/core/appid";
import { EAppType, type AppOverviewLike } from "../src/core/steamTypes";
import { buildItems, loadDump } from "./helpers/fixtureTree";

const steam = (appid: number): AppOverviewLike => ({ appid, app_type: 1, BIsModOrShortcut: () => false });
const shortcut = (appid: number): AppOverviewLike => ({ appid, app_type: EAppType.Shortcut, BIsModOrShortcut: () => true });
const lookupOf = (...apps: AppOverviewLike[]) => (id: number) => apps.find((a) => a.appid === id) ?? null;

describe("findAppAppId (strategy 1)", () => {
  for (const name of ["steam-uninstalled", "steam-installed", "shortcut"]) {
    it(`finds the appid the probe found in ${name}`, () => {
      const dump = loadDump(name);
      expect(findAppAppId(buildItems(dump))).toBe(dump.strategy1_appAppid);
      expect(dump.strategy1_appAppid).toBe(dump.overview.appid);
    });
  }

  it("returns null when nothing carries .app.appid", () => {
    expect(findAppAppId([false, undefined, { type: "T", props: { label: "x" } }])).toBeNull();
  });

  it("does not loop on cyclic objects outside props/children", () => {
    const a: any = { type: "T", props: {} };
    a._owner = a;
    a.props.self = a;
    expect(findAppAppId([a])).toBeNull();
  });
});

describe("findOwnerAppId (strategy 2)", () => {
  it("reads _owner.pendingProps.overview.appid", () => {
    expect(findOwnerAppId([false, { _owner: { pendingProps: { overview: { appid: 42 } } } }])).toBe(42);
  });
  it("is null on the S0.3 shape", () => {
    expect(findOwnerAppId(buildItems(loadDump("steam-installed")))).toBeNull();
  });
});

describe("validateAppId (5.4)", () => {
  it("accepts a Steam game", () => {
    expect(validateAppId(100002, lookupOf(steam(100002)))?.appid).toBe(100002);
  });
  it.each([0, -1, 1.5, NaN, "620", null])("rejects appid %s", (bad) => {
    expect(validateAppId(bad, lookupOf(steam(620)))).toBeNull();
  });
  it("rejects shortcuts by app_type and by BIsModOrShortcut", () => {
    expect(validateAppId(3000000001, lookupOf(shortcut(3000000001)))).toBeNull();
    expect(validateAppId(7, lookupOf({ appid: 7, app_type: 1, BIsModOrShortcut: () => true }))).toBeNull();
  });
  it("rejects invalid type, unknown apps and mismatched overviews", () => {
    expect(validateAppId(7, lookupOf({ appid: 7, app_type: EAppType.Invalid }))).toBeNull();
    expect(validateAppId(7, lookupOf())).toBeNull();
    expect(validateAppId(7, () => steam(8))).toBeNull();
  });
  it("works without BIsModOrShortcut (feature-detected)", () => {
    expect(validateAppId(7, lookupOf({ appid: 7, app_type: 1 }))).not.toBeNull();
  });
});

describe("fromContextMenu", () => {
  it("resolves Steam games from the fixture tree", () => {
    for (const name of ["steam-uninstalled", "steam-installed"]) {
      const dump = loadDump(name);
      const r = fromContextMenu(buildItems(dump), null, lookupOf(steam(dump.overview.appid)));
      expect(r?.appid).toBe(dump.overview.appid);
    }
  });

  it("returns null for the shortcut fixture", () => {
    const dump = loadDump("shortcut");
    expect(fromContextMenu(buildItems(dump), dump.overview.appid, lookupOf(shortcut(dump.overview.appid)))).toBeNull();
  });

  it("prefers the tree over the outer hint (no stale appid, R7)", () => {
    const dump = loadDump("steam-installed");
    const r = fromContextMenu(buildItems(dump), 999, lookupOf(steam(dump.overview.appid), steam(999)));
    expect(r?.appid).toBe(dump.overview.appid);
  });

  it("falls back to the hint when the tree has no appid", () => {
    expect(fromContextMenu([false], 620, lookupOf(steam(620)))?.appid).toBe(620);
    expect(fromContextMenu([false], null, lookupOf(steam(620)))).toBeNull();
  });
});
