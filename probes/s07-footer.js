// Spike S0.7 (design doc 8.4, approach F4): CHANGES THE UI. While a Steam game's capsule
// is focused, adds two temporary footer entries, "[S0.7] L3" and "[S0.7] R3", keyed by the
// footer's own button enum (LeftStickClick / RightStickClick). Tagged [SS-PROBE:S0.7].
// Remove with: node scripts/cdp.mjs probe uninstall
(() => {
  const reg = (window.__storeShortcutProbes ??= {});
  if (reg.s07) return "s07 already installed";
  const D = window.DFL;
  const Footer = D.findModuleExport(
    (e) => typeof e?.prototype?.SetActionsFromMap === "function" && typeof e?.prototype?.UpdateForFocusedNode === "function",
  );
  const g4 = D.findModuleExport((e) => e && typeof e === "object" && e.LeftStickClick === 17 && e.RightStickClick === 19);
  if (!Footer || !g4) return "s07: footer store or button enum NOT found";

  // Same depth limit the plugin would use: the capsule's own props, not the page's.
  function steamAppid(el) {
    let f = el && D.getReactInstance(el);
    for (let depth = 0; f && depth < 12; depth++, f = f.return) {
      const appid = f.memoizedProps?.app?.appid;
      if (typeof appid !== "number") continue;
      const ov = window.appStore?.GetAppOverviewByAppID?.(appid);
      return ov && !ov.BIsModOrShortcut?.() ? appid : null;
    }
    return null;
  }

  let lastLogged;
  const patch = D.beforePatch(Footer.prototype, "SetActionsFromMap", function (args) {
    try {
      const appid = steamAppid(this.m_nodeForCurrentDescriptions?.m_element);
      if (appid !== lastLogged) {
        lastLogged = appid;
        console.log("[SS-PROBE:S0.7] " + JSON.stringify({ appid, route: location.pathname }));
      }
      if (appid != null) args[0] = { ...args[0], [g4.LeftStickClick]: "[S0.7] L3", [g4.RightStickClick]: "[S0.7] R3" };
    } catch (e) {
      console.log("[SS-PROBE:S0.7] error " + e);
    }
  });
  reg.s07 = { unpatch: () => patch.unpatch() };
  return "s07 installed";
})();
