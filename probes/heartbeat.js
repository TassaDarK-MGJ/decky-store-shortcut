// VT smoke test (design doc 13.6 d): logs a heartbeat every 2 s so the recording
// shows whether SharedJSContext keeps running while Game Mode is not on screen.
// Remove with: node scripts/cdp.mjs probe uninstall
(() => {
  const reg = (window.__storeShortcutProbes ??= {});
  if (reg.heartbeat) return "heartbeat already installed";
  let n = 0;
  const id = setInterval(() => {
    n += 1;
    console.log(`[SS-PROBE:HB] n=${n} hidden=${document.hidden}`);
  }, 2000);
  reg.heartbeat = { unpatch: () => clearInterval(id) };
  return "heartbeat installed";
})();
