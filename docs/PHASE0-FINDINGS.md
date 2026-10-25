# Phase 0 findings

Results of the discovery spikes (design doc, section 11). Notation: **[V]** verified at
runtime, **[VE]** found statically in the Steam client bundle (exists, behaviour not proven).
No Valve code is reproduced here, only identifiers and descriptions.

## Environment

| Item | Value |
|---|---|
| OS | Bazzite 44.20261023.0 (`bazzite-deck`, KDE desktop + gamescope Game Mode) |
| Steam client | `steamdeck_stable`, build `1792618285` (2026-10-21) |
| Decky Loader | v3.3.0 |
| UI bundle | `~/.steam/steam/steamui/sp.js` |

## Phase 1 spikes

### S0.0 static analysis (2026-10-25, build 1792618285): done

- **e** `().LibraryContextMenu` appears in two modules (library app menu and storage drive menu);
  the `navigator:` filter selects the app menu. `launchSource` and `AppProperties` present. [VE]
- **e** The «Properties…» item is not a direct menu child: the last child is a Fragment
  `[separator, Properties item]`, rendered only for a single app outside kiosk mode. Its
  `onSelected` calls `navigator.AppProperties(appid)`. [VE]
- **f** The menu is opened with props `overview`, `client`, `launchSource`, `bInGamepadUI`,
  `strCollectionId`, `includeMultiSelect`, `hasCustomArtwork`, `onChangeArtwork`, `ownerWindow`,
  `omitPrimaryAction`, `additionalActions`. `GetTargetApps()` returns `[overview]` or, with
  multi-select active, all selected overviews. `render` returns the `Menu` with a flat children array. [VE]
- **g** The client itself builds store links as `steam://store/<appid>`. The native context menu
  has no store entry. [VE]
- **h** `SteamClient.Settings.GetCurrentLanguage()` is used by Steam's language screen. [VE]

### S0.1 environment (desktop session): done

`window.DFL` present with every symbol needed for Phase 1; `Navigation.NavigateToSteamWeb`,
`NavigateToExternalWeb`, `CloseSideMenus` present; `appStore.GetAppOverviewByAppID(620)` →
`{appid: 620, app_type: 1}`, `BIsModOrShortcut` is a function; language `"spanish"`. [V]
Live `afterPatch` calls the handler as `handler.call(this, args, ret)`, so `this` is the menu instance. [V]

### S0.2 finder (desktop session): done

The three finder steps return the menu class; its prototype has `render`, `GetTargetApps`,
`shouldComponentUpdate`, `componentDidMount`, `BuildManageSubmenu`, among others. [V]

### Method 13.6 (d) smoke test (2026-10-25): done

Game Mode (`gamescope-session-plus ogui-steam`, logind session on VT1); Claude Code on tty3.
CDP target `SharedJSContext`, `dfl` = `object`, `href` = `…/routes/library/tab/Installed`
(the desktop client instead reports `index.html?…USE_POPUPS=true…`). [V]
Heartbeat probe recorded for 60 s while the author switched to Game Mode and back: 31/31
beats, every gap exactly 2.0 s, so SharedJSContext keeps running while its VT is not
shown. `document.hidden` stayed `false` throughout (it does not reflect VT switches). Image
and controller OK on every switch, with no black screen. Method (d) is valid and (c) is not needed. [V]

### S0.3 menu shape in Gamepad UI (2026-10-25, build 1792618285): done

Log-only probe on `LibraryContextMenu.prototype.render`, 9 menu openings: library grid
(Steam games, installed and not), Home, search, and three non-Steam shortcuts.
Fixtures (appids replaced): `test/fixtures/s03-menu-*.json`. [V]

- **Renders:** exactly one `render` per menu opening; no re-render while the menu stays open.
- **appid:** in every case `this.props.overview.appid` = `GetTargetApps()` (always one
  element) = strategy 1 (`.app.appid` in the tree) = live `appStore` lookup. Strategy 2
  (`_owner.pendingProps.overview`) is always `null` in this build.
- **Props:** `navigator, instance, overview, client ("mostavailable"), launchSource,
  bInGamepadUI (true), hasCustomArtwork, onChangeArtwork, strCollectionId, ownerWindow`.
  `includeMultiSelect` and `omitPrimaryAction` were never passed. `strCollectionId` is
  `steamos` in the library grid, `deck-desktop-apps` in the non-Steam tab and `null` from Home/search.
- **Shortcuts:** `app_type` 1073741824, `BIsModOrShortcut()` → `true`; same menu shape
  (Manage submenu gains a `RemoveShortcut` item). Uninstalled games: same shape; installed ones gain `Uninstall`.
- **Shape:** `ret.type` is the `Menu` component, `ret.props.children` is a flat array of 12
  (with `undefined`/`false` holes). Last child (index 11) is the Fragment
  `[separator, Properties]` in every case. Item 0 (primary action) has `launchSource` in its `onSelected`.
- **Other plugins:** HLTB adds `HLTBContextMenuItem` (index 9); SteamGridDB adds an item with
  key `sgdb-change-artwork` (index 10), immediately before the Properties Fragment.
- **Recorder note:** `Runtime.enable` replays the console buffer, so a recording starts with old
  messages that all share one timestamp. Filter by tag/seq when analysing.

Decisions (7.3 and 7.4 revised by S0.4, see below):
- ~~7.3: one patch layer~~ → **two layers** (S0.4 showed outer-only edits never reach the
  screen in Library views).
- ~~7.4: drop `launchSource`~~ → the inner layer is the generic menu component shared by
  every Steam menu, so an app-menu check is required there (anchor or `launchSource`).
- **7.5:** anchor = the Fragment containing `AppProperties`; insert just before it. Our item and
  SGDB's will sit side by side, in plugin-load order.
- **5.2:** in the outer layer `this.props.overview` = `GetTargetApps()[0]` = strategy 1. Strategy 2 is dead.
- Non-Steam shortcuts must be filtered out explicitly (`BIsModOrShortcut()` / `app_type`).

Not covered:
- Collections: the author has none. The menu shape does not depend on `strCollectionId`.
- Tools (Proton / Steam Linux Runtime): not listed anywhere in the Game Mode library (the
  "Non-Steam" tab holds only shortcuts), so their menu cannot be opened. Keep the `app_type` filter anyway.
- Multi-select: Game Mode has none (author). `GetTargetApps().length === 1` stays as a cheap guard.

### S0.4 opening the store (2026-10-25, build 1792618285): done

Probes `s04-store` (M1–M5), `s04-diag`, `s04-placement`, `s04-layers`, `s04-final`; recordings in
`.spikes/` (not committed). Observations by the author in Game Mode plus console logs. [V]

**Store-opening methods**, on the same owned game from Home:

| Method | Opens store | Where | Back (B) |
|---|---|---|---|
| M1 `NavigateToSteamWeb('steam://store/<id>')` | yes | Steam web view (`/routes/steamweb`) | **broken**: B lands on a blank `data:text/html,…` page in the web view and stays there; more B presses do not leave it |
| M2 `NavigateToExternalWeb('https://store.steampowered.com/app/<id>/')` | yes | `/routes/externalweb` | OK |
| M3 `SteamClient.Apps.ShowStore(id)` | yes | `/routes/steamweb` | OK |
| M4 `SteamClient.URL.ExecuteSteamURL('steam://store/<id>')` | yes | `/routes/steamweb` | OK |
| M5 `NavigateToSteamWeb('https://store.steampowered.com/app/<id>/')` | yes | `/routes/steamweb` | OK, back to the same capsule |

All return `undefined` synchronously. In every case the context menu was already gone 800 ms
later (`contextMenuNodes=0` in the owner window), so `CloseSideMenus()` is not needed.
With M5: uninstalled game OK, DLC-heavy game opens the base game page, consecutive games
never open the previous game's page, B always returns to the capsule. No delisted game available to test.

**Injection: Library views need the inner layer.** Items added to the outer render result
(`LibraryContextMenu.prototype.render` → `ret.props.children`) show in Home/Recent but **not**
in any Library tab (Installed, All, SteamOS-compatible); HLTB's item has the same problem.
SteamGridDB's item shows everywhere. Cause, from `s04-layers`:
- The outer render's `ret` is the `Menu` element; its `type` is a function component that renders an
  inner class component (minified `O`) whose `props.children[0]` is the outer items array.
- In Library views, ~50 ms and ~300 ms after mounting, that inner component gets new props
  through `shouldComponentUpdate` with a **fresh** items array (11 entries, not the outer array,
  no outer-layer additions) and the outer `render` is **not** called again. Home has no such update.
- An item spliced in the inner layer (`render` on `ret2.props.children[0]`, and `shouldComponentUpdate`
  on `nextProps.children` when it returns `true`) shows in Home and in every Library tab.
- In both inner paths, strategy 1 (`.app.appid` in the items array) gave the right appid every time and
  matched the outer `this.props.overview`. Strategy 2 stays `null`. The anchor index is 11 on the first
  render and 10 on the later updates (no HLTB), so it must be searched for every time.
- The inner component is the generic menu used by every Steam menu (submenus included): it needs an
  app-menu check. In `s04-final`, "anchor present or `launchSource` present" was enough, and
  shortcuts were rejected by `appStore.GetAppOverviewByAppID(appid).BIsModOrShortcut()`.

Decisions:
- **6.1 chain:** `NavigateToSteamWeb('https://store.steampowered.com/app/<id>/')` (M5) → fallback
  `SteamClient.URL.ExecuteSteamURL('steam://store/<id>')` (M4) → `NavigateToExternalWeb(https)` (M2).
  `steam://` must never be passed to `NavigateToSteamWeb`. M3 also works but is a typed-only internal API, so it is not used.
- **6.2:** no `CloseSideMenus()`.
- **7.3:** two layers: outer `render` (only to reach the `Menu` element and hook its `type` once),
  inner `render` + `shouldComponentUpdate`. Dedupe by our key on every pass; keep every patch handle.
- **5.2:** appid derived in the inner layer from the items array (strategy 1) on every pass; outer
  `this.props.overview` only as a cross-check or fallback. No appid cached across menus.

### S0.8 desktop / Big Picture: partial

Decky injects `DFL` into the desktop client's SharedJSContext (Steam started with `-steamdeck`).
Gamepad UI behaviour is tested in Game Mode instead (method 13.6 d).
