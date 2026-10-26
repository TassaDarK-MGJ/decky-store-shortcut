# Device checklist (Game Mode, real controller)

Design doc 14.3. Re-run after every Steam or Decky update. Each row: context × expected
result. Fill in the status (✅ / ❌ / n/a) and the date. Phase 1 covers Feature A only.

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

## Known issues

- React error #185 once seen after disabling the plugin with a store page open and then
  pressing B. Not reproduced on 2026-10-26 (that attempt never actually unloaded the
  plugin). See design doc 12.1.
