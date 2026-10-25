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

### S0.3 menu shape in Gamepad UI: pending

See `SPIKES-RUNBOOK.md`.

### S0.4 opening the store: pending

See `SPIKES-RUNBOOK.md`.

### S0.8 desktop / Big Picture: partial

Decky injects `DFL` into the desktop client's SharedJSContext (Steam started with `-steamdeck`).
Gamepad UI behaviour is tested in Game Mode instead (method 13.6 d).
