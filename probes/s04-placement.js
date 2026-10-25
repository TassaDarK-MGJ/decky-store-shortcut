// Spike S0.4 follow-up: entries appear in Home but not in Library views. Tries three
// placements of a harmless MenuItem (it only logs) to see which ones Library renders:
//   P1 pushed at the end (after the Properties Fragment), as s04-store does
//   P2 spliced just before the Properties Fragment (design 7.5, same as SteamGridDB)
//   P3 spliced at index 1 (right after the primary action)
// Also logs the menu item texts the owner window's DOM shows 600 ms after render.
// Remove with: node scripts/cdp.mjs probe uninstall
(() => {
  const reg = (window.__storeShortcutProbes ??= {});
  if (reg.s04place) return "s04place already installed";
  const D = window.DFL;
  const R = window.SP_REACT;
  const mod = D.findModuleByExport((e) => e?.toString && e.toString().includes("().LibraryContextMenu"));
  const fn = mod && Object.values(mod).find((x) => x?.toString?.().includes("navigator:"));
  const Cls = fn && D.fakeRenderComponent(fn).type;
  if (!Cls?.prototype?.render || !R) return "s04place: class or SP_REACT NOT found";

  const src = (f) => (typeof f === "function" ? String(f) : "");
  const isAnchor = (c) => {
    const inner = c?.props?.children;
    const arr = Array.isArray(inner) ? inner : inner ? [inner] : [];
    return src(c?.props?.onSelected).includes("AppProperties") || arr.some((k) => src(k?.props?.onSelected).includes("AppProperties"));
  };
  const item = (tag, appid) =>
    R.createElement(D.MenuItem, { key: "ss-probe-place-" + tag, onSelected: () => console.log(`[SS-PROBE:S0.4P] selected ${tag} appid=${appid}`) }, `[S0.4] ${tag}`);

  let seq = 0;
  const patch = D.afterPatch(Cls.prototype, "render", function (_args, ret) {
    try {
      const n = ++seq;
      const ov = this.props?.overview;
      const kids = ret?.props?.children;
      if (!ov || ov.BIsModOrShortcut?.() || !Array.isArray(kids)) return ret;
      if (!kids.some((k) => k?.key?.startsWith?.("ss-probe-place-"))) {
        kids.push(item("P1-end", ov.appid));
        const a = kids.findIndex(isAnchor);
        kids.splice(a < 0 ? kids.length : a, 0, item("P2-beforeProps", ov.appid));
        kids.splice(1, 0, item("P3-index1", ov.appid));
      }
      const win = this.props?.ownerWindow;
      console.log(`[SS-PROBE:S0.4P] render seq=${n} appid=${ov.appid} coll=${this.props?.strCollectionId ?? null} len=${kids.length}`);
      setTimeout(() => {
        try {
          const doc = win?.document ?? document;
          const texts = [...doc.querySelectorAll("[class*='MenuItem'], [role='menuitem']")]
            .map((e) => (e.textContent ?? "").trim().slice(0, 30))
            .filter(Boolean);
          console.log(`[SS-PROBE:S0.4P] dom seq=${n} path=${location.pathname} items=${JSON.stringify(texts)}`);
        } catch (e) {
          console.log("[SS-PROBE:S0.4P] dom error: " + e);
        }
      }, 600);
    } catch (e) {
      console.log("[SS-PROBE:S0.4P] probe error: " + e);
    }
    return ret;
  });
  reg.s04place = patch;
  return "s04place installed";
})();
