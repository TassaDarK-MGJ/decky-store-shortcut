# Device checklist (Game Mode, real controller)

Design doc 14.3. Re-run after every Steam or Decky update. Each row: context × expected
result. Fill in the status (✅ / ❌ / n/a) and the date. Feature A since v1.0.0; Feature B (L3/R3 shortcut) since H2.

Environment of the last run: Bazzite 44, Steam client build `1792618285` (steamdeck_stable),
Decky Loader 3.3.0, SteamGridDB 1.8.1 installed.

## Feature A: context menu entry (acceptance 7.7)

| # | Context | Expected | Status | Date |
|---|---|---|---|---|
| A1 | Library → All games grid, Steam game | "Go to store page" shown before the Properties separator; opens that game's store | ✅ | 2026-10-26 |
| A2 | Library → Installed tab | Same as A1 (inner layer: the entry survives the menu refresh) | ✅ | 2026-10-26 |
| A3 | Home → recent games | Same as A1 | ✅ | 2026-10-26 |
| A4 | Library → a collection | Same as A1 | n/a (no collections; same code path as A1) | 2026-10-26 |
| A5 | Search result | Same as A1 | n/a (search results have no context menu) | 2026-10-26 |
| A6 | Menu on game A, close, menu on game B, open store | B's store page, never A's | ✅ | 2026-10-26 |
| A7 | Non-Steam shortcut | No entry; menu identical to native | ✅ | 2026-10-26 |
| A8 | Uninstalled Steam game | Entry shown; opens its store | ✅ | 2026-10-26 |
| A9 | In the store page, press **B** | Back to the capsule / view the menu was opened from | ✅ | 2026-10-26 |
| A10 | SteamGridDB entry in the same menu | Both entries present, no duplicates, both work | ✅ | 2026-10-26 |
| A11 | Turn the entry off in the panel | Entry gone from the next menu, no restart; panel says "turned off" | ✅ | 2026-10-26 |
| A12 | Turn it back on | Entry back in the next menu | ✅ | 2026-10-26 |
| A13 | Language: panel set to each language and Automatic | Label follows the setting | ✅ (en/es; fr/it/de added afterwards) | 2026-10-26 |
| A14 | SharedJSContext console while doing the above | No new errors from the plugin | ✅ (recording `.spikes/checklist-f1.jsonl`) | 2026-10-26 |

Not testable on this machine: multi-select (Game Mode has none, S0.3).

## Feature B: L3/R3 shortcut and button bar hint (acceptance 8.5)

| # | Context | Expected | Status | Date |
|---|---|---|---|---|
| B1 | Home → recent games, Steam game focused | Button bar shows the L3 glyph + "Store page"; **L3** opens that game's store | ✅ | 2026-10-26 |
| B2 | Library tabs (Installed, All…), Steam game focused | Same as B1 | ✅ | 2026-10-26 |
| B3 | In the store page, press **B** | Back to the focused capsule | ✅ | 2026-10-26 |
| B4 | Move focus across several games, press L3 on each | Always the focused game's store | ✅ | 2026-10-26 |
| B5 | Non-Steam shortcut focused | No hint in the bar; L3 shows the "no store page" notice | ✅ | 2026-10-26 |
| B6 | Focus on tabs, side menu, QAM, search box | No hint; L3 does nothing | ✅ | 2026-10-26 |
| B7 | Context menu open on a game, press L3 | Nothing happens | ✅ | 2026-10-26 |
| B8 | A game's detail page (A on a capsule), press L3 | Record what happens (not covered by the spikes) | ✅ no hint shown, L3 does nothing (expected) | 2026-10-27 |
| B9 | Panel: shortcut button → R3 | Hint shows the R3 glyph at once; R3 opens the store, L3 does nothing | ✅ | 2026-10-26 |
| B10 | Panel: shortcut button → Off | Hint gone at once; L3/R3 do nothing | ✅ | 2026-10-26 |
| B11 | Panel: "Show in the button bar" off (button on) | Hint gone; the button still works | ✅ | 2026-10-26 |
| B12 | Panel: non-Steam notice off | B5 without the notice | ✅ | 2026-10-26 |
| B13 | Panel status | Shortcut button and button bar lines say active / off | ✅ | 2026-10-26 |
| B14 | Language change in the panel | Hint text follows at once | ✅ | 2026-10-26 |
| B15 | Feature A still works (A1, A6, A10) | Unchanged | ✅ | 2026-10-26 |
| B16 | SharedJSContext console while doing the above | No new errors from the plugin | ✅ (`.spikes/checklist-f2b.jsonl`) | 2026-10-26 |

## Known issues

- **Blank first store page after restarting Steam's UI from a console** (both features, and
  maybe Steam's own store links): the first `/steamweb` navigation creates the store browser
  view, which stays on its blank `data:text/html` page; going back and opening again works for
  the rest of the session. It does not happen after a shutdown or reboot, so it is parked and
  not treated as a bug. See design doc 6.3.

- React error #185 once seen after disabling the plugin with a store page open and then
  pressing B. Not reproduced on 2026-10-26 (that attempt never actually unloaded the
  plugin). See design doc 12.1.
