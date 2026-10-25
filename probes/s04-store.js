// Spike S0.4 (design doc 6.1–6.2): TEMPORARY entries at the end of the library
// context menu, one per store-opening method. Each selection logs [SS-PROBE:S0.4].
// Only for single-app, non-shortcut menus. Remove with: node scripts/cdp.mjs probe uninstall
(() => {
  const reg = (window.__storeShortcutProbes ??= {});
  if (reg.s04) return "s04 already installed";
  const D = window.DFL;
  const R = window.SP_REACT;

  const mod = D.findModuleByExport((e) => e?.toString && e.toString().includes("().LibraryContextMenu"));
  const fn = mod && Object.values(mod).find((x) => x?.toString?.().includes("navigator:"));
  const Cls = fn && D.fakeRenderComponent(fn).type;
  if (!Cls?.prototype?.render || !R) return "s04: LibraryContextMenu class or SP_REACT NOT found";

  const METHODS = [
    ["M1 NavigateToSteamWeb", (id) => D.Navigation.NavigateToSteamWeb(`steam://store/${id}`)],
    ["M2 NavigateToExternalWeb", (id) => D.Navigation.NavigateToExternalWeb(`https://store.steampowered.com/app/${id}/`)],
    ["M3 Apps.ShowStore", (id) => SteamClient.Apps.ShowStore(id)],
    ["M4 URL.ExecuteSteamURL", (id) => SteamClient.URL.ExecuteSteamURL(`steam://store/${id}`)],
  ];

  const patch = D.afterPatch(Cls.prototype, "render", function (_args, ret) {
    try {
      const apps = typeof this.GetTargetApps === "function" ? this.GetTargetApps() : [this.props?.overview];
      if (apps.length !== 1 || !apps[0]) return ret;
      const ov = apps[0];
      const appid = ov.appid;
      if (ov.BIsModOrShortcut?.()) return ret;
      const kids = ret?.props?.children;
      if (!Array.isArray(kids)) return ret;
      for (const [label, open] of METHODS) {
        const key = "ss-probe-s04-" + label.slice(0, 2);
        if (kids.some((k) => k?.key === key)) continue;
        kids.push(
          R.createElement(
            D.MenuItem,
            {
              key,
              onSelected: () => {
                const t0 = Date.now();
                try {
                  const r = open(appid);
                  console.log(`[SS-PROBE:S0.4] ${label} appid=${appid} returned=${typeof r}`);
                } catch (e) {
                  console.log(`[SS-PROBE:S0.4] ${label} appid=${appid} THREW ${e}`);
                }
                // Record whether a context menu is still around shortly after navigating.
                setTimeout(() => {
                  const menus = document.querySelectorAll("[class*='contextMenu'], [class*='ContextMenu']").length;
                  console.log(`[SS-PROBE:S0.4] ${label} +${Date.now() - t0}ms contextMenuNodes=${menus} path=${location.pathname}`);
                }, 800);
              },
            },
            `[S0.4] ${label}`,
          ),
        );
      }
    } catch (e) {
      console.log("[SS-PROBE:S0.4] probe error: " + e);
    }
    return ret;
  });
  reg.s04 = patch;
  return "s04 installed";
})();
