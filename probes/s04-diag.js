// Spike S0.4 diagnosis: why the [S0.4] entries show up in Home but not in the Library.
// Install AFTER s04-store so this patch runs after it. Logs [SS-PROBE:S0.4D] per render
// (children after s04's push) and, 600 ms later, what the owner window's DOM shows.
// Remove with: node scripts/cdp.mjs probe uninstall
(() => {
  const reg = (window.__storeShortcutProbes ??= {});
  if (reg.s04diag) return "s04diag already installed";
  const D = window.DFL;
  const mod = D.findModuleByExport((e) => e?.toString && e.toString().includes("().LibraryContextMenu"));
  const fn = mod && Object.values(mod).find((x) => x?.toString?.().includes("navigator:"));
  const Cls = fn && D.fakeRenderComponent(fn).type;
  if (!Cls?.prototype?.render) return "s04diag: LibraryContextMenu class NOT found";
  let seq = 0;
  const patch = D.afterPatch(Cls.prototype, "render", function (_args, ret) {
    try {
      const n = ++seq;
      const kids = ret?.props?.children;
      const arr = Array.isArray(kids) ? kids : [];
      const win = this.props?.ownerWindow;
      const info = {
        seq: n,
        appid: this.props?.overview?.appid,
        coll: this.props?.strCollectionId ?? null,
        retType: ret?.type?.displayName || ret?.type?.name || typeof ret?.type,
        isArray: Array.isArray(kids),
        frozen: Object.isFrozen(arr),
        len: arr.length,
        tailKeys: arr.slice(-6).map((k) => (k && typeof k === "object" ? k.key ?? "(nokey)" : String(k))),
        winTitle: win?.document?.title ?? null,
        winIsMain: win === window,
      };
      console.log("[SS-PROBE:S0.4D] render " + JSON.stringify(info));
      setTimeout(() => {
        try {
          const doc = win?.document ?? document;
          const all = [...doc.querySelectorAll("*")];
          const hits = all.filter((e) => e.childElementCount === 0 && (e.textContent ?? "").includes("[S0.4]")).length;
          const menuItems = doc.querySelectorAll("[class*='MenuItem'], [role='menuitem']").length;
          console.log(`[SS-PROBE:S0.4D] dom seq=${n} s04Hits=${hits} menuItems=${menuItems} path=${location.pathname}`);
        } catch (e) {
          console.log("[SS-PROBE:S0.4D] dom error: " + e);
        }
      }, 600);
    } catch (e) {
      console.log("[SS-PROBE:S0.4D] probe error: " + e);
    }
    return ret;
  });
  reg.s04diag = patch;
  return "s04diag installed";
})();
