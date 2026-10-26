// Spike S0.5 (design doc 5.3, 11): log-only. On every footer focus update, logs the
// focused nav node and where an appid sits in its React fiber chain. Tagged [SS-PROBE:S0.5].
// Hooks the footer action store (S0.0 c), which already tracks the focused node.
// Remove with: node scripts/cdp.mjs probe uninstall
(() => {
  const reg = (window.__storeShortcutProbes ??= {});
  if (reg.s05) return "s05 already installed";
  const D = window.DFL;
  const Footer = D.findModuleExport(
    (e) => typeof e?.prototype?.SetActionsFromMap === "function" && typeof e?.prototype?.UpdateForFocusedNode === "function",
  );
  if (!Footer) return "s05: footer store class NOT found";

  const typeName = (t) => (typeof t === "string" ? t : t?.displayName || t?.name || typeof t);
  const ids = new WeakMap();
  let nextId = 0;
  const footerId = (o) => (ids.has(o) ? ids.get(o) : (ids.set(o, ++nextId), nextId));

  // Every fiber up to 40 levels whose props carry an appid, with the prop path.
  function scan(el) {
    const hits = [];
    let f = el && D.getReactInstance(el);
    for (let depth = 0; f && depth < 40; depth++, f = f.return) {
      const p = f.memoizedProps;
      if (!p || typeof p !== "object") continue;
      const paths = [];
      if (typeof p.appid === "number") paths.push(["appid", p.appid]);
      if (typeof p.app?.appid === "number") paths.push(["app.appid", p.app.appid]);
      if (typeof p.overview?.appid === "number") paths.push(["overview.appid", p.overview.appid]);
      if (typeof p.appOverview?.appid === "number") paths.push(["appOverview.appid", p.appOverview.appid]);
      for (const [path, appid] of paths) hits.push({ depth, path, appid, type: typeName(f.type), propKeys: Object.keys(p).slice(0, 10) });
    }
    return hits;
  }

  let seq = 0;
  let last = null;
  const patch = D.afterPatch(Footer.prototype, "UpdateForFocusedNode", function ([node], ret) {
    try {
      if (node === last) return ret;
      last = node;
      seq += 1;
      const el = node?.m_element;
      const hits = scan(el);
      const first = hits[0];
      const ov = first && window.appStore?.GetAppOverviewByAppID?.(first.appid);
      console.log(
        "[SS-PROBE:S0.5] " +
          JSON.stringify({
            seq,
            footer: footerId(this),
            route: location.pathname,
            tree: node?.m_Tree?.id ?? null,
            nodeId: node?.m_id ?? node?.id ?? null,
            el: el ? `${el.tagName}.${String(el.className).split(" ")[0]}` : null,
            domFocus: el ? el === el.ownerDocument.activeElement : null,
            hits: hits.slice(0, 4),
            check: ov ? { app_type: ov.app_type, modOrShortcut: ov.BIsModOrShortcut?.() } : null,
          }),
      );
    } catch (e) {
      console.log("[SS-PROBE:S0.5] error " + e);
    }
    return ret;
  });
  reg.s05 = { unpatch: () => patch.unpatch() };
  return "s05 installed";
})();
