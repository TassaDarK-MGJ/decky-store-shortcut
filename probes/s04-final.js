// Spike S0.4 closing probe: two-layer patch (design 7.3) with appid derived per update.
// Adds "[S0.4] Tienda" before the Properties Fragment in the inner menu component
// (render + shouldComponentUpdate). The appid comes from the items array itself
// (strategy 1: .app.appid; strategy 2: element _owner.pendingProps.overview), compared
// against the last outer render's overview. Selecting it opens the store with M5.
// Remove with: node scripts/cdp.mjs probe uninstall
(() => {
  const reg = (window.__storeShortcutProbes ??= {});
  if (reg.s04final) return "s04final already installed";
  const D = window.DFL;
  const R = window.SP_REACT;
  const mod = D.findModuleByExport((e) => e?.toString && e.toString().includes("().LibraryContextMenu"));
  const fn = mod && Object.values(mod).find((x) => x?.toString?.().includes("navigator:"));
  const Cls = fn && D.fakeRenderComponent(fn).type;
  if (!Cls?.prototype?.render || !R) return "s04final: class or SP_REACT NOT found";

  const KEY = "ss-probe-final";
  const log = (msg, obj) => console.log("[SS-PROBE:S0.4F] " + msg + (obj ? " " + JSON.stringify(obj) : ""));
  const src = (f) => (typeof f === "function" ? String(f) : "");
  const isAnchor = (c) => {
    const inner = c?.props?.children;
    const arr = Array.isArray(inner) ? inner : inner ? [inner] : [];
    return src(c?.props?.onSelected).includes("AppProperties") || arr.some((k) => src(k?.props?.onSelected).includes("AppProperties"));
  };
  const hasLaunchSource = (arr) => !!D.findInReactTree(arr, (x) => src(x?.props?.onSelected).includes("launchSource"));
  const handles = [];
  let outerAppid = null;
  let seq = 0;

  function deriveAppid(arr) {
    const s1 = D.findInTree(arr, (x) => typeof x?.app?.appid === "number", { walkable: ["props", "children"] })?.app?.appid ?? null;
    const s2 = arr.map((x) => x?._owner?.pendingProps?.overview?.appid).find((x) => typeof x === "number") ?? null;
    return { s1, s2, outer: outerAppid };
  }

  function inject(arr, where) {
    if (!Array.isArray(arr)) return;
    const anchor = arr.findIndex(isAnchor);
    const ls = hasLaunchSource(arr);
    if (anchor < 0 && !ls) return; // not an app context menu (generic Menu component)
    const ids = deriveAppid(arr);
    const appid = ids.s1 ?? ids.s2 ?? ids.outer;
    const ov = appid != null ? window.appStore?.GetAppOverviewByAppID?.(appid) : null;
    const shortcut = !!ov?.BIsModOrShortcut?.();
    const dup = arr.findIndex((k) => k?.key === KEY);
    if (dup >= 0) arr.splice(dup, 1);
    log(where, { seq, ...ids, chosen: appid, shortcut, anchor, ls, len: arr.length, hadDup: dup >= 0 });
    if (appid == null || shortcut) return;
    const at = arr.findIndex(isAnchor);
    arr.splice(at < 0 ? arr.length : at, 0,
      R.createElement(D.MenuItem, {
        key: KEY,
        onSelected: () => {
          log(`selected appid=${appid}`);
          D.Navigation.NavigateToSteamWeb(`https://store.steampowered.com/app/${appid}/`);
        },
      }, "[S0.4] Tienda"));
  }

  function patchInner(InnerCls) {
    handles.push(D.afterPatch(InnerCls.prototype, "render", function (_a, ret2) {
      try { inject(ret2?.props?.children?.[0], "inner render"); } catch (e) { log("inner render error " + e); }
      return ret2;
    }));
    handles.push(D.afterPatch(InnerCls.prototype, "shouldComponentUpdate", function ([next], should) {
      try { if (should === true) inject(next?.children, "inner sCU"); } catch (e) { log("inner sCU error " + e); }
      return should;
    }));
  }

  handles.push(D.afterPatch(Cls.prototype, "render", function (_a, ret) {
    try {
      seq += 1;
      outerAppid = this.props?.overview?.appid ?? null;
      log("outer render", { seq, appid: outerAppid, coll: this.props?.strCollectionId ?? null });
      if (!reg.s04final.hooked && ret && typeof ret.type === "function") {
        reg.s04final.hooked = true;
        handles.push(D.afterPatch(ret, "type", (_b, r) => {
          try {
            if (!reg.s04final.patched && r?.type?.prototype?.render) {
              reg.s04final.patched = true;
              patchInner(r.type);
            }
          } catch (e) { log("type wrapper error " + e); }
          return r;
        }));
      }
    } catch (e) {
      log("outer render error " + e);
    }
    return ret;
  }));

  reg.s04final = { unpatch: () => handles.forEach((h) => h.unpatch()), hooked: false, patched: false };
  return "s04final installed";
})();
