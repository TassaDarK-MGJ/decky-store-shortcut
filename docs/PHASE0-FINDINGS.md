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

Game Mode (`gamescope-session-plus ogui-steam`, logind session on VT1); dev tools on tty3.
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

## Phase 2 spikes

### S0.0 a–d static analysis (2026-10-26, build 1792618285): done

Bounded searches over `~/.steam/steam/steamui/sp.js` (Python, `-I`). Only identifiers and prose
here (rule 11.1). All findings are **[VE]**: they say what the code does, not what happens at runtime.

**(a) Unhandled button events.** Path of a button-down in a nav tree:
1. The event is dispatched to the focused element. Only OK, CANCEL, SECONDARY, OPTIONS and START
   have a *logical* event (`vgp_onok`…`vgp_onmenu`); D-pad goes to `vgp_ondirection`.
   **L3/R3 have no logical event.**
2. If still unhandled: `TryRootButtonListeners` (handlers added with the tree's
   `RegisterGlobalButtonHandler` and `RegisterOnUnhandledButtonCallback`).
3. If still unhandled: the controller's `FireUnhandledGamepadEventCallbacks`, which dispatches to
   everything registered with `RegisterForUnhandledButtonDownEvents` (H1).

Steam itself registers two such callbacks: one only plays the "failed navigation" sound for
the D-pad; the other handles only the Steam and QAM buttons. Neither touches L3/R3. The event
passed along is the original one, so its `target` should be the focused element (to confirm in S0.6).

**(b) L3/R3 as navigation buttons.** The raw-to-nav table maps
`GAMEPAD_LEFTSTICK_CLICK` → `LSTICK_CLICK` (15) and `GAMEPAD_RIGHTSTICK_CLICK` → `RSTICK_CLICK` (16),
so they do reach the nav layer. Every use of `LSTICK_CLICK`/`RSTICK_CLICK` in the bundle:
- the table itself and the enum;
- keyboard emulation (Ctrl+F6/F7, Ctrl+6/7);
- the hardware-test field (any button counts as input);
- the virtual keyboard: L3 toggles Caps Lock (only while the keyboard is open);
- a VR-overlay button-to-icon switch.

**No library, Home or capsule component handles L3 or R3.** The only library capsule that opens
`LibraryContextMenu` (the one passing `hasCustomArtwork`) has no `onButtonDown` nearby. So L3/R3
on a capsule should end up in step 3 above, and H1 is the expected hook. L3 as the default (8.3)
looks safe statically.

**(c) Footer legend.** The footer is a store class (module exports `Ww`, alongside the footer button
enum `g4`, the nav→footer converter `sr` and the footer→nav converter `ck`). On every focus change it
takes the focused nav node, calls `GetActiveActionDescriptions()` (which merges
`actionDescriptionMap` from the node up to the root, child first), subscribes to
`ActionDescriptionChangedCallbackList` of each ancestor, and converts the result with
`SetActionDescriptionsFromMap` → `SetActionsFromMap`. The focused node is kept in
`m_nodeForCurrentDescriptions`.

**Blocker for F1/F2 as designed:** the nav→footer converter has no case for `LSTICK_CLICK` or
`RSTICK_CLICK`; they fall to the default, which is the footer's **A** button. Putting
`{[LSTICK_CLICK]: label}` in any `actionDescriptionMap` (F1, F2, or the tree's
`RegisterGlobalButtonHandler` description) would **overwrite the A label** instead of showing L3.

**(d) Glyph.** The footer renders every footer-enum button that has a description (Home, A and B
in fixed places, the rest in between), with a glyph component that has cases for
`LeftStickClick` (17, aria-label `#ControllerButton_L3`) and `RightStickClick` (19). So the footer
**can draw L3/R3**: it only needs an action keyed by the footer enum, not by the nav enum.
Tapping that legend calls `ck(17)` = `INVALID`, which does nothing (harmless).

**Consequence: new footer approach F4 (replaces F1 as first choice).** Patch the footer store's
prototype (`SetActionsFromMap`, found with `findModuleExport` by its methods) so that, when
`this.m_nodeForCurrentDescriptions` is a library capsule of a Steam game, the map gets
`{17 or 19: label}`. Because `SetActionsFromMap` drops keys missing from the new map, the entry
disappears by itself when focus moves. The same node (`m_element` → fiber) is what S0.5 must
resolve to an appid. To verify in S0.7: the glyph shows, refreshes on focus change, and is
removed on unpatch.

Correction: the `RegisterOnActionDescriptionsChangedCallback` console line seen on 2026-10-26
comes from the Steam **web view's** gamepad bridge (store page), not from the library footer.

### S0.5–S0.7 in Game Mode (2026-10-26, build 1792618285): done

Method 13.6 (d). Probes `s05-focus`, `s06-buttons`, `s07-footer` installed together; recording
`.spikes/phase2.jsonl` (230 lines). Covered: Home recents, Library tabs Installed / All /
SteamOS-compatible / Desktop apps (non-Steam shortcuts), side menu, QAM, context menu open.
Not covered: a game's detail page.

**S0.5, appid of the focused capsule.** Only one footer store instance. On every capsule, in every
view, the focused node's element is the capsule `DIV` (DOM focus follows: `activeElement` matches)
and the fiber chain has `memoizedProps.app.appid` at **depth 10** (Home: props `app`, `bFeatured`,
`bPrefer2xImage`…; Library grid: `app`, `navRef`, `strCollectionId`…). Home also has a bare `appid`
at depth 20. Non-Steam shortcuts: same shape, `BIsModOrShortcut()` → `true`. Tabs, the search box,
the side menu and the QAM: no appid within 40 levels. With the context menu open, the focused
node is a menu item with `overview.appid` at depth 12–13 (the menu instance), **no** `app.appid`.
Rule adopted: walk at most 11 levels up from the node's element, take the first `app.appid`,
then the common validation (5.4).

**S0.6, button hooks.** L3 and R3 pressed on capsules (Home, Installed, SteamOS-compatible) and
with the context menu open. Steam does nothing visible with either, anywhere tested.
- **H1 (`RegisterForUnhandledButtonDownEvents`) fires for every press**: `detail.button` 15/16,
  `is_repeat: false`, `source: 1`, `target` = the focused capsule element, so the appid can be
  resolved from the event itself. The tree log shows `unhandled: false` only because a registered
  H1 callback counts as handling.
- H1 **also fires with the context menu open** (target = menu item in `ModalDialogOverlay_Modal_N`).
  The app.appid rule above returns null there, so nothing happens. Keep that rule for the button.
- H3 (`RegisterForControllerInputMessages`) works too: callback `(controllerIndex, rawButton,
  pressed)`, L3 = 25, R3 = 41. It brings no element and fires for every button, so it is not needed.
- L3 is free in every view tested: the default stays **L3** (8.3).

**S0.7, footer (F4).** Patching the footer store prototype's `SetActionsFromMap` works:
"[S0.7] L3" and "[S0.7] R3" show **with their glyphs** while a Steam capsule is focused, move with
the focus, disappear on non-capsules, non-Steam shortcuts and the context menu, and go away on
unpatch. F4 is the footer approach for H2.
