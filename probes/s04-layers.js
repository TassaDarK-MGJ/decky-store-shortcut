// Spike S0.4 follow-up (design 7.3): in Library views, items added to the outer
// LibraryContextMenu render never reach the screen (HLTB's neither); SteamGridDB's,
// added through an inner layer, do. This probe adds two harmless items that only log:
//   OUTER  spliced before the Properties Fragment in the outer render result
//   INNER  spliced the same way in the inner menu component (render + shouldComponentUpdate)
// and logs which array each layer sees. Remove with: node scripts/cdp.mjs probe uninstall
(() => {
  const reg = (window.__storeShortcutProbes ??= {});
  if (reg.s04layers) return "s04layers already installed";
  const D = window.DFL;
  const R = window.SP_REACT;
  const mod = D.findModuleByExport((e) => e?.toString && e.toString().includes("().LibraryContextMenu"));
  const fn = mod && Object.values(mod).find((x) => x?.toString?.().includes("navigator:"));
  const Cls = fn && D.fakeRenderComponent(fn).type;
  if (!Cls?.prototype?.render || !R) return "s04layers: class or SP_REACT NOT found";

  const log = (msg, obj) => console.log("[SS-PROBE:S0.4L] " + msg + (obj ? " " + JSON.stringify(obj) : ""));
  const src = (f) => (typeof f === "function" ? String(f) : "");
  const tn = (t) => (t == null ? String(t) : typeof t === "string" ? t : t.displayName || t.name || typeof t);
  const isAnchor = (c) => {
    const inner = c?.props?.children;
    const arr = Array.isArray(inner) ? inner : inner ? [inner] : [];
    return src(c?.props?.onSelected).includes("AppProperties") || arr.some((k) => src(k?.props?.onSelected).includes("AppProperties"));
  };
  const outerArrays = new WeakSet();
  const handles = [];
  let lastAppid = null;
  let seq = 0;

  function addItem(arr, tag) {
    if (!Array.isArray(arr) || arr.some((k) => k?.key === "ss-probe-layer-" + tag)) return false;
    const appid = lastAppid;
    const a = arr.findIndex(isAnchor);
    arr.splice(a < 0 ? arr.length : a, 0,
      R.createElement(D.MenuItem, { key: "ss-probe-layer-" + tag, onSelected: () => log(`selected ${tag} appid=${appid}`) }, `[S0.4] ${tag}`));
    return true;
  }
  const describe = (arr) => ({
    isArray: Array.isArray(arr),
    len: Array.isArray(arr) ? arr.length : null,
    fromOuter: Array.isArray(arr) && outerArrays.has(arr),
    hasOuter: Array.isArray(arr) && arr.some((k) => k?.key === "ss-probe-layer-OUTER"),
    hasInner: Array.isArray(arr) && arr.some((k) => k?.key === "ss-probe-layer-INNER"),
    hasSgdb: Array.isArray(arr) && arr.some((k) => k?.key === "sgdb-change-artwork"),
  });

  function patchInner(InnerCls) {
    handles.push(D.afterPatch(InnerCls.prototype, "render", function (_a, ret2) {
      try {
        const items = ret2?.props?.children?.[0];
        const before = describe(items);
        const added = addItem(items, "INNER");
        log("inner render", { seq, inner: tn(InnerCls), childrenLen: ret2?.props?.children?.length, before, added });
      } catch (e) {
        log("inner render error " + e);
      }
      return ret2;
    }));
    handles.push(D.afterPatch(InnerCls.prototype, "shouldComponentUpdate", function ([nextProps], should) {
      try {
        const before = describe(nextProps?.children);
        const added = should === true ? addItem(nextProps?.children, "INNER") : false;
        log("inner sCU", { seq, should, before, added });
      } catch (e) {
        log("inner sCU error " + e);
      }
      return should;
    }));
    log("inner layer patched", { inner: tn(InnerCls) });
  }

  handles.push(D.afterPatch(Cls.prototype, "render", function (_a, ret) {
    try {
      seq += 1;
      const ov = this.props?.overview;
      lastAppid = ov?.appid ?? null;
      const kids = ret?.props?.children;
      if (Array.isArray(kids)) outerArrays.add(kids);
      if (!ov?.BIsModOrShortcut?.()) addItem(kids, "OUTER");
      log("outer render", { seq, appid: lastAppid, coll: this.props?.strCollectionId ?? null, retType: tn(ret?.type), typeIsFn: typeof ret?.type, hasProto: !!ret?.type?.prototype?.render, len: kids?.length });
      if (!reg.s04layers.innerHooked && ret && typeof ret.type === "function") {
        reg.s04layers.innerHooked = true;
        // Wrap this element's type once to reach the inner component it renders.
        handles.push(D.afterPatch(ret, "type", (_b, r) => {
          try {
            if (!reg.s04layers.innerPatched && r?.type?.prototype?.render) {
              reg.s04layers.innerPatched = true;
              patchInner(r.type);
            } else if (!reg.s04layers.innerPatched) {
              log("type wrapper: no inner class", { rType: tn(r?.type), rTypeOf: typeof r?.type });
            }
          } catch (e) {
            log("type wrapper error " + e);
          }
          return r;
        }));
      }
    } catch (e) {
      log("outer render error " + e);
    }
    return ret;
  }));

  reg.s04layers = { unpatch: () => handles.forEach((h) => h.unpatch()), innerHooked: false, innerPatched: false };
  return "s04layers installed";
})();
