// Blank first store page after a Steam UI restart: log-only trace of the store browser
// view. Patches the browser view class prototype (found by its methods, never by
// calling GetStoreBrowser(), which would warm the view up) and logs route changes.
// Tagged [SS-PROBE:BLANK]. Remove with: node scripts/cdp.mjs probe uninstall
(() => {
  const reg = (window.__storeShortcutProbes ??= {});
  if (reg.blank) return "blank already installed";
  const D = window.DFL;
  const View = D.findModuleExport((e) => typeof e?.prototype?.BExternalTriggeredLoad === "function" && typeof e?.prototype?.LoadURL === "function");
  if (!View) return "blank: browser view class NOT found";
  const t0 = performance.now();
  const short = (v) => (typeof v === "string" ? v.slice(0, 70) : typeof v === "number" || typeof v === "boolean" ? v : v == null ? String(v) : typeof v);
  const log = (what, extra) => console.log("[SS-PROBE:BLANK] " + JSON.stringify({ t: Math.round(performance.now() - t0), what, ...extra }));
  const state = (b) => ({ name: b?.name, view: !!b?.m_browserView, hist: b?.m_history ? `${b.m_history.index}/${b.m_history.entries?.length}` : null, loading: b?.m_bLoading, url: short(b?.m_URL) });

  const undo = [];
  try {
    for (const m of ["LoadURL", "OnStartRequest", "OnStartLoad", "OnFinishedRequest", "OnLoadError", "Destroy"]) {
      // Some handlers are bound getters (decorators): those cannot be patched, skip them.
      if (typeof Object.getOwnPropertyDescriptor(View.prototype, m)?.value !== "function") continue;
      const p = D.beforePatch(View.prototype, m, function (args) {
        try {
          if (this?.name !== "MainBrowser") return;
          log(m, { args: args.map(short), ...state(this) });
        } catch (e) {
          console.log("[SS-PROBE:BLANK] error " + e);
        }
      });
      undo.push(() => p.unpatch());
    }
  } catch (e) {
    undo.forEach((u) => u());
    return "blank: install failed, rolled back: " + e;
  }
  const w = () => window.SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance;
  log("installed", { storeBrowserExists: !!w()?.m_StoreBrowser, route: location.pathname });
  // Route changes, plus a 100 ms sample of the view while on /steamweb (its history
  // handler is a bound getter, so history changes are only visible this way).
  let lastRoute = location.pathname;
  let lastState = "";
  const id = setInterval(() => {
    const st = state(w()?.m_StoreBrowser);
    if (location.pathname !== lastRoute) {
      lastRoute = location.pathname;
      log("route", { route: lastRoute, ...st });
    } else if (lastRoute.endsWith("/steamweb") && JSON.stringify(st) !== lastState) {
      log("sample", st);
    }
    lastState = JSON.stringify(st);
  }, 100);
  reg.blank = { unpatch: () => undo.forEach((u) => u()) };
  return `blank installed (${undo.length - 1} methods patched)`;
})();
