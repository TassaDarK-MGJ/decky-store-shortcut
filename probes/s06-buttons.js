// Spike S0.6 (design doc 8.2, 11): log-only. Records which hook sees L3/R3. Tagged [SS-PROBE:S0.6].
// - tree: every nav tree's HandleButtonDownEventAsLogicalEvent (did the tree handle it?)
// - H1:   FocusNavController.RegisterForUnhandledButtonDownEvents (payload and target)
// - H3:   SteamClient.Input.RegisterForControllerInputMessages (raw layer, first 80 calls)
// Remove with: node scripts/cdp.mjs probe uninstall
(() => {
  const reg = (window.__storeShortcutProbes ??= {});
  if (reg.s06) return "s06 already installed";
  const D = window.DFL;
  const STICKS = { 15: "L3", 16: "R3" };
  const undo = [];

  function appidNear(el) {
    let f = el && D.getReactInstance(el);
    for (let depth = 0; f && depth < 30; depth++, f = f.return) {
      const p = f.memoizedProps;
      const appid = p?.app?.appid ?? p?.overview?.appid ?? p?.appid;
      if (typeof appid === "number") return { appid, depth };
    }
    return null;
  }
  const describe = (el) => (el?.tagName ? `${el.tagName}.${String(el.className).split(" ")[0]}` : el ? String(el) : null);

  const tree = D.getGamepadNavigationTrees()[0];
  const treeProto = tree && Object.getPrototypeOf(tree);
  if (typeof treeProto?.HandleButtonDownEventAsLogicalEvent === "function") {
    const p = D.afterPatch(treeProto, "HandleButtonDownEventAsLogicalEvent", function ([evt], unhandled) {
      try {
        const b = evt?.detail?.button;
        if (STICKS[b])
          console.log("[SS-PROBE:S0.6] " + JSON.stringify({ hook: "tree", button: STICKS[b], tree: this.id, unhandled, route: location.pathname }));
      } catch (e) {
        console.log("[SS-PROBE:S0.6] tree error " + e);
      }
      return unhandled;
    });
    undo.push(() => p.unpatch());
  } else console.log("[SS-PROBE:S0.6] tree hook NOT available");

  const fnc = window.FocusNavController;
  if (typeof fnc?.RegisterForUnhandledButtonDownEvents === "function") {
    const h = fnc.RegisterForUnhandledButtonDownEvents((evt) => {
      try {
        const b = evt?.detail?.button;
        if (!STICKS[b]) return;
        console.log(
          "[SS-PROBE:S0.6] " +
            JSON.stringify({
              hook: "H1",
              button: STICKS[b],
              is_repeat: evt.detail.is_repeat,
              source: evt.detail.source,
              target: describe(evt.target),
              targetAppid: appidNear(evt.target),
              route: location.pathname,
            }),
        );
      } catch (e) {
        console.log("[SS-PROBE:S0.6] H1 error " + e);
      }
    });
    undo.push(() => (typeof h === "function" ? h() : h?.Unregister?.()));
  } else console.log("[SS-PROBE:S0.6] H1 NOT available");

  const input = window.SteamClient?.Input;
  if (typeof input?.RegisterForControllerInputMessages === "function") {
    let n = 0;
    const h = input.RegisterForControllerInputMessages((...args) => {
      if (++n > 80) return;
      console.log("[SS-PROBE:S0.6] " + JSON.stringify({ hook: "H3", n, args: JSON.stringify(args).slice(0, 300) }));
    });
    undo.push(() => h?.unregister?.() ?? h?.Unregister?.());
  } else console.log("[SS-PROBE:S0.6] H3 NOT available");

  reg.s06 = { unpatch: () => undo.forEach((u) => u()) };
  return `s06 installed (${undo.length} hooks)`;
})();
