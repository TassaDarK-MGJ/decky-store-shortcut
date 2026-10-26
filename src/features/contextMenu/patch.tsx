// Feature A patches (design 7.3, two layers, decided in S0.3/S0.4):
// - outer: LibraryContextMenu.prototype.render. Records which item array belongs to
//   which app and, once, wraps the returned Menu element's type to reach the inner
//   menu class.
// - inner: that class's render and shouldComponentUpdate. In Library views Steam
//   hands the inner menu a fresh item array through shouldComponentUpdate without
//   calling the outer render again, so the item must be injected here.
import { afterPatch, MenuItem, type Patch } from "@decky/ui";
import { fromContextMenu } from "../../core/appid";
import { safe } from "../../core/guard";
import { log } from "../../core/log";
import type { AppOverviewLike } from "../../core/steamTypes";
import { openStorePage } from "../../core/store";
import { t } from "../../i18n";
import { getSettings } from "../../settings/store";
import { ITEM_KEY } from "./constants";
import { insertBeforeAnchor, isAppContextMenu, removeByKey } from "./menuItems";

interface OuterInfo {
  appid: number | null;
  single: boolean;
}

function lookupOverview(appid: number): AppOverviewLike | null {
  return window.appStore?.GetAppOverviewByAppID?.(appid) ?? null;
}

function targetCount(menu: any): number {
  if (typeof menu?.GetTargetApps === "function") return menu.GetTargetApps()?.length ?? 0;
  return menu?.props?.overview ? 1 : 0;
}

export function patchContextMenu(menuClass: any): () => void {
  const handles: Patch[] = [];
  // Keyed by the item array of one render pass: no appid outlives its own menu (5.2).
  const outerInfo = new WeakMap<object, OuterInfo>();
  let innerClass: any = null;
  let disposed = false;

  function inject(items: unknown, where: string): void {
    if (!Array.isArray(items)) return;
    removeByKey(items, ITEM_KEY);
    if (!getSettings().menu_item_enabled || !isAppContextMenu(items)) return;
    const info = outerInfo.get(items);
    // Several apps selected: the store page is for one game (R15).
    if (info && !info.single) return;
    const resolved = fromContextMenu(items, info?.appid ?? null, lookupOverview);
    if (!resolved) return;
    const { appid } = resolved;
    const { anchored } = insertBeforeAnchor(
      items,
      <MenuItem key={ITEM_KEY} onSelected={() => safe("open store page", () => openStorePage(appid), false)}>
        {t("menu_item")}
      </MenuItem>,
    );
    log.debug(`${where}: item for ${appid}${anchored ? "" : " appended (no Properties anchor)"}`);
  }

  function patchInner(cls: any): void {
    handles.push(
      afterPatch(cls.prototype, "render", (_args, ret) => {
        safe("inner menu render", () => inject(ret?.props?.children?.[0], "inner render"), undefined);
        return ret;
      }),
      afterPatch(cls.prototype, "shouldComponentUpdate", ([nextProps], shouldUpdate) => {
        if (shouldUpdate === true) safe("inner menu update", () => inject(nextProps?.children, "inner update"), undefined);
        return shouldUpdate;
      }),
    );
    log.debug("inner menu layer patched");
  }

  // The Menu element's type is a function component that renders the inner class.
  // Wrapping it on one element is enough to learn that class once.
  function hookMenuType(element: any): void {
    afterPatch(element, "type", (_args, rendered) => {
      safe(
        "menu type hook",
        () => {
          const cls = rendered?.type;
          if (!disposed && !innerClass && typeof cls?.prototype?.render === "function") {
            innerClass = cls;
            patchInner(cls);
          }
        },
        undefined,
      );
      return rendered;
    });
  }

  handles.push(
    afterPatch(menuClass.prototype, "render", function (this: any, _args, ret) {
      safe(
        "context menu render",
        () => {
          const items = ret?.props?.children;
          if (Array.isArray(items)) {
            outerInfo.set(items, { appid: this?.props?.overview?.appid ?? null, single: targetCount(this) === 1 });
            // Enough on its own in Home; the inner layer covers Library views.
            inject(items, "outer render");
          }
          if (!innerClass && ret && typeof ret.type === "function") hookMenuType(ret);
        },
        undefined,
      );
      return ret;
    }),
  );

  return () => {
    disposed = true;
    for (const h of handles.splice(0)) safe("unpatch", () => h.unpatch(), undefined);
  };
}
