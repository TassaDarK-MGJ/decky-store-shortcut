// Removes every probe installed through scripts/cdp.mjs.
(() => {
  const reg = window.__storeShortcutProbes ?? {};
  const removed = [];
  for (const [name, p] of Object.entries(reg)) {
    try {
      p.unpatch();
      removed.push(name);
    } catch (e) {
      removed.push(`${name} (error: ${e})`);
    }
  }
  delete window.__storeShortcutProbes;
  return removed.length ? "removed: " + removed.join(", ") : "nothing installed";
})();
