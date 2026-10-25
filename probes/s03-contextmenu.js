// Spike S0.3 (design doc 11, 5.2, 7.3–7.5): log-only patch on the library context
// menu class. Every render of the menu prints one JSON line tagged [SS-PROBE:S0.3].
// It never changes the menu. Remove with: node scripts/cdp.mjs probe uninstall
(() => {
  const reg = (window.__storeShortcutProbes ??= {});
  if (reg.s03) return "s03 already installed";
  const D = window.DFL;

  const mod = D.findModuleByExport((e) => e?.toString && e.toString().includes("().LibraryContextMenu"));
  const fn = mod && Object.values(mod).find((x) => x?.toString?.().includes("navigator:"));
  const Cls = fn && D.fakeRenderComponent(fn).type;
  if (!Cls?.prototype?.render) return "s03: LibraryContextMenu class NOT found";

  const typeName = (t) =>
    t == null ? String(t) : typeof t === "string" ? t : typeof t === "symbol" ? t.toString() : t.displayName || t.name || typeof t;
  const src = (f) => (typeof f === "function" ? String(f) : "");

  function describeChild(c) {
    if (c == null || c === false || c === true) return { empty: String(c) };
    if (typeof c !== "object") return { primitive: typeof c };
    const p = c.props ?? {};
    const sel = src(p.onSelected);
    const d = {
      type: typeName(c.type),
      key: c.key ?? null,
      props: Object.keys(p).filter((k) => k !== "children"),
      launchSource: sel.includes("launchSource"),
      appProperties: sel.includes("AppProperties"),
      label: typeof p.label === "string" ? "<string>" : p.label ? "<node>" : null,
    };
    if (p.children != null && typeof p.children === "object") {
      const kids = Array.isArray(p.children) ? p.children : [p.children];
      if (kids.some((k) => k && typeof k === "object" && k.props)) d.children = kids.map(describeChild);
    }
    return d;
  }

  // Strategy 1 (5.2): object with .app.appid somewhere under props/children.
  function findAppAppid(node, depth = 0) {
    if (!node || typeof node !== "object" || depth > 12) return null;
    if (node.app && typeof node.app.appid === "number") return node.app.appid;
    if (Array.isArray(node)) {
      for (const n of node) {
        const r = findAppAppid(n, depth + 1);
        if (r != null) return r;
      }
      return null;
    }
    if (node.props) return findAppAppid(node.props, depth + 1) ?? findAppAppid(node.props.children, depth + 1);
    return null;
  }

  let seq = 0;
  const patch = D.afterPatch(Cls.prototype, "render", function (_args, ret) {
    try {
      seq += 1;
      const props = this?.props ?? {};
      const ov = props.overview;
      let target = null;
      try {
        target = typeof this.GetTargetApps === "function" ? this.GetTargetApps().map((o) => o?.appid) : "no-method";
      } catch (e) {
        target = "error: " + e;
      }
      const kids = ret?.props?.children;
      const arr = Array.isArray(kids) ? kids : kids != null ? [kids] : [];
      const anchorIdx = arr.findIndex((c) => {
        const own = src(c?.props?.onSelected).includes("AppProperties");
        const inner = c?.props?.children;
        const innerArr = Array.isArray(inner) ? inner : inner ? [inner] : [];
        return own || innerArr.some((k) => src(k?.props?.onSelected).includes("AppProperties"));
      });
      let check = null;
      try {
        const live = ov && window.appStore?.GetAppOverviewByAppID?.(ov.appid);
        check = live ? { appid: live.appid, app_type: live.app_type, modOrShortcut: live.BIsModOrShortcut?.() } : null;
      } catch (e) {
        check = "error: " + e;
      }
      const dump = {
        seq,
        thisKind: typeName(this?.constructor),
        propKeys: Object.keys(props),
        overview: ov ? { appid: ov.appid, app_type: ov.app_type, modOrShortcut: ov.BIsModOrShortcut?.() } : null,
        liveCheck: check,
        strCollectionId: props.strCollectionId ?? null,
        includeMultiSelect: props.includeMultiSelect ?? null,
        bInGamepadUI: props.bInGamepadUI ?? null,
        omitPrimaryAction: props.omitPrimaryAction ?? null,
        client: typeof props.client === "string" ? props.client : typeof props.client,
        getTargetApps: target,
        strategy1_appAppid: findAppAppid(ret),
        strategy2_ownerOverviewAppid: ret?._owner?.pendingProps?.overview?.appid ?? null,
        ret: { type: typeName(ret?.type), childrenIsArray: Array.isArray(kids), childrenLen: arr.length, anchorIdx },
        items: arr.map(describeChild),
      };
      console.log("[SS-PROBE:S0.3] " + JSON.stringify(dump));
    } catch (e) {
      console.log("[SS-PROBE:S0.3] probe error: " + e);
    }
    return ret;
  });
  reg.s03 = patch;
  return "s03 installed";
})();
