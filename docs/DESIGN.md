# Store Shortcut: design document

**Open a Steam library game's store page in Game Mode (Gamepad UI), without entering its game page first.**

| | |
|---|---|
| Status | Phase 1 released as v1.0.0 (2026-10-26). Phase 2 released as v1.1.0 (2026-10-27). Current release: v1.1.3 |
| Plugin | `Store Shortcut` (package `decky-store-shortcut`, install folder `Store-Shortcut`) |
| License | 0BSD for the project's own code; the template's BSD-3-Clause notice is kept (section 17) |
| UI languages | English, French, Spanish, Italian, German (follows Steam's language) |
| Reference environment | Bazzite 44, Steam client `steamdeck_stable` build `1792618285`, Decky Loader 3.3.0 |

This is the English edition of the working design document. The project was developed spec-first: this document was written before any plugin code, every Steam internal it relies on was checked with live probes before it was used (section 11), and the document was corrected wherever reality differed. Section numbers match the references in the code, probes and other docs ("design doc 6.3" and so on). The day-by-day log is summarised in 12.1.

---

## 0. How to read this document

The first version was written without a running Steam, from the source code of the pieces involved (template, `@decky/ui`, `@decky/api`, `@decky/rollup`, decky-loader) and of two plugins in production in October 2026. Every technical claim carries a certainty tag:

| Tag | Meaning |
|---|---|
| **[V]** | **Verified.** Read in source code, seen in a production plugin that does exactly this, or confirmed live on the device. |
| **[VE]** | **Verified statically.** Found in the installed Steam client's UI bundle (spike S0.0). It proves the symbol or string *exists* in that build, not that it behaves as expected. |
| **[T]** | **Typed only.** Exists in the `@decky/ui` typings with no evidence of runtime use. The typings for `FocusNavController` say themselves: *"This entire file is essentially unconfirmed"*. |
| **[H]** | **Hypothesis.** Reasonable, no evidence yet. Only usable after a spike. |

### Ground rules

1. **No invented APIs.** Nothing tagged [T] or [H] goes into production code until a spike (section 11) confirms it on the device. [VE] is not enough for behaviour either.
2. **Modern Decky APIs only** (section 2), enforced by `pnpm run lint:legacy` before every build.
3. **Fail open.** No patch may throw inside Steam's render. If something is not recognised, the patch does nothing and the rest of Steam keeps working.
4. **Each feature degrades on its own.** A failure in Feature B cannot break Feature A.
5. **No GPL code.** The main reference plugin (SteamGridDB) is GPL-3.0 (7.8): the pattern is reimplemented, never copied. No Valve code is copied into the repository either (11.1).
6. Spike results go to `docs/PHASE0-FINDINGS.md`, and this document is corrected where reality differs.
7. **Trace before fixing.** For runtime problems, record what happens with a probe first, then change code (a lesson from 6.3).

---

## 1. Goal and scope

**Goal.** Jump to the store page of a game that is already in the library without entering its game page first.

**Feature A, context menu entry.** The menu of a library capsule gets a "Go to store page" item next to the native ones (Manage, Properties…).

**Feature B, configurable button.** With a capsule focused, a button (L3 or R3, configurable) opens that game's store page, ideally with a hint in the bottom button bar (footer legend).

**The critical point of the whole project** is getting the right `appid` for the capsule or the menu (section 5).

**Out of scope:** Steam's desktop mode; the system browser; non-Steam games (they have no store page); backends with binaries or Docker; any network scraping; an extra entry on the game detail page (Steam already has a store button there).

**Initial feasibility assessment** (before any spike):

| Piece | Confidence | Why |
|---|---|---|
| Modern stack (`@decky/api`, `@decky/ui`, `@decky/rollup`, `api_version: 1`) | High | Migration guide, template and loader source |
| Opening the store through `Navigation.NavigateToSteamWeb` | High | game-glance (Oct 2026) does it on hardware |
| Feature A: menu item and `appid` | High, with Steam's inherent fragility | decky-steamgriddb (Oct 2026) patches the same menu |
| Feature B: catching L3/R3 on a focused capsule | Medium | Functions exist in the typings, no plugin uses them |
| Feature B: footer hint | Low to medium | Capsules are Valve components, no precedent |

### 1.1 Phases

| Phase | Scope | Spikes that unlock it | Milestones |
|---|---|---|---|
| **Phase 1** | Feature A only, plus the core (`appid`, store opening, guard), settings backend, minimal panel, i18n | S0.0 (e–h), S0.1–S0.4, S0.8 | H0-F1, H1, H3-F1 |
| **Phase 2** | Feature B: L3/R3 shortcut and its footer hint. Started only once Phase 1 worked in Game Mode | S0.0 (a–d), S0.5–S0.7 | H0-F2, H2, H3-F2 |

During Phase 1 nothing of Feature B was written. The architecture (4.1) was designed so that Feature B could be added without touching the core.

---

## 2. Mandatory rule: modern APIs only

Source: [Decky's new API migration guide](https://wiki.deckbrew.xyz/en/plugin-dev/new-api-migration) plus the source code.

| Area | USE (modern) | FORBIDDEN (legacy / deprecated) | Evidence |
|---|---|---|---|
| Frontend packages | `@decky/api`, `@decky/ui`, `@decky/rollup` (dev) | `decky-frontend-lib` (old npm name) | [V] migration guide |
| Entry point | `definePlugin` from `@decky/api` | `definePlugin` from `@decky/ui` | [V] marked `@deprecated` |
| Backend calls | `callable<Args, Ret>("method")` / `call` | `ServerAPI`, `callPluginMethod` | [V] `ServerAPI` removed |
| Router, toasts | `routerHook`, `toaster` from `@decky/api` | `serverApi.routerHook`, `serverApi.toaster` | [V] |
| QAM visibility hook | `useQuickAccessVisible` from `@decky/api` | the `@decky/ui` one | [V] |
| Webpack lookups | `findModuleExport`, `findModuleByExport`, `findModuleDetailsByExport` | `findModuleChild`, `findAllModules` | [V] deprecated; `findModuleChild` warns at runtime |
| Static CSS classes | `quickAccessMenuClasses`, … | `staticClasses`, `scrollClasses`, `achievementClasses` | [V] deprecated, even though the template still uses `staticClasses` |
| Python | `import decky`, `decky.pyi` | `import decky_plugin` | [V] |
| Backend contract | `plugin.json` with `"api_version": 1` (instantiated `Plugin`, positional args) | legacy mode | [V] `sandboxed_plugin.py` |
| Build | `rollup.config.js` with `deckyPlugin()`, `"type": "module"` | hand-written rollup/webpack configs | [V] |

**`lint:legacy`** (`scripts/lint-legacy.mjs`) fails the build if `src/`, `main.py` or the configuration contain any of: `decky-frontend-lib`, `ServerAPI`, `serverApi`, `decky_plugin`, `staticClasses`, `scrollClasses`, `achievementClasses`, `findModuleChild`, `findAllModules`, or a `definePlugin` imported from `@decky/ui`. It runs as `prebuild`.

---

## 3. Verified facts about the environment

### 3.1 Versions checked (2026-10-25)

| Piece | Version / commit | Notes |
|---|---|---|
| `@decky/ui` | 4.16.0 | Source repo is decky-frontend-lib. LGPL-2.1 |
| `@decky/api` | 1.1.3 | Requires Decky ≥ 3.0 |
| `@decky/rollup` | 1.0.2 | |
| decky-plugin-template | `90d0780` | BSD-3-Clause. `pnpm-lock.yaml` with `lockfileVersion: '9.0'` |
| decky-loader | `00cd202` | |
| Reference 1: decky-steamgriddb | v1.8.1 (`26682f6`) | Patches the library context menu. **GPL-3.0** |
| Reference 2: game-glance | v3.5.0 (`a9a926f`) | Opens the store the way Steam does; tested on hardware. MIT |

### 3.2 Findings that shape the design

1. **[V] At runtime `@decky/ui` comes from the loader, not from `node_modules`.** `@decky/rollup` marks it external and maps it to the global `DFL`. The installed package only provides types, so every API is feature-detected (`typeof X === "function"`). `@decky/api`, in contrast, is bundled into the plugin.
2. **[V] `plugin.json` must have a `flags` key**, even if empty.
3. **[V] `routerHook.addPatch` only patches the Gamepad UI router**, which is the target mode.
4. **[V] Enums in `@decky/ui`'s `globals` (e.g. `EAppType`) are not exported at runtime.** Local constants are used instead.
5. **[V] Steam's stores are window globals**: `appStore`, `appDetailsStore`, `collectionStore`, `FocusNavController`, `SteamUIStore`, `SteamClient`.
6. **[V] Decky uses CDP on `http://localhost:8080`**, the same mechanism used by the dev tools (13.5).
7. **[V] Lockfile version 9.0** (pnpm 9) is what the template and the store review expect.

### 3.3 Development machine

Bazzite 44 (immutable Fedora Atomic image with Steam Game Mode), not SteamOS. Steam client on the `steamdeck_stable` branch, build `1792618285`; Decky Loader 3.3.0. The Steam UI bundle lives in `~/.steam/steam/steamui/`, and everything relevant is in `sp.js`. Toolchain in `$HOME` (Homebrew): Node 24, pnpm 9.15.9 through corepack. Other plugins installed during development, including **decky-steamgriddb**, which patches the same context menu (coexistence is tested, R14).

---

## 4. Architecture

### 4.1 Overview

```
                 ┌──────────────────────── Steam (Gamepad UI / CEF) ───────────────────────┐
  Capsule        │  LibraryContextMenu ──afterPatch──► [features/contextMenu]               │
  context menu   │                                          │ appid                         │
                 │                                          ▼                               │
  L3 / R3 with   │  FocusNavController (unhandled btn) ► [features/buttonShortcut]          │
  a capsule      │  footer action store (SetActionsFromMap) ◄── hint                        │
  focused        │                                          │ focused element               │
                 │                                          ▼                               │
                 │                              [core/appid]  resolve + validate            │
                 │                                          │ valid appid                   │
                 │                                          ▼                               │
                 │                              [core/store]  openStorePage(appid)          │
                 └──────────────────────────────────────────────────────────────────────────┘
                              ▲ callable()
                 ┌────────────┴───────────┐
                 │ main.py (Plugin)       │  persistent settings (JSON)
                 └────────────────────────┘
```

### 4.2 Repository layout

```
decky-store-shortcut/
├── plugin.json, package.json, rollup.config.js, tsconfig.json
├── main.py                  # settings backend only (get_settings / set_setting)
├── decky.pyi                # from the template
├── LICENSE                  # 0BSD on top, template's BSD-3-Clause below
├── src/
│   ├── index.tsx            # definePlugin: wiring and onDismount
│   ├── core/                # appid resolver, store opener, safe() guard, log, Steam types
│   ├── features/
│   │   ├── contextMenu/     # Feature A: constants, finder, patch, menu items
│   │   ├── buttonShortcut/  # Feature B: constants, finder, button hook, footer, pure logic
│   │   └── status.ts        # per-feature availability for the panel
│   ├── settings/            # schema, cache, Quick Access panel
│   └── i18n/                # en, fr, es, it, de
├── scripts/                 # lint-legacy, deploy, package, cdp (dev only)
├── probes/                  # spike probes injected over CDP (dev only, not shipped)
├── test/                    # Vitest unit tests + sanitised fixtures captured in the spikes
└── docs/                    # this document, PHASE0-FINDINGS, SPIKES-RUNBOOK, device-checklist
```

The template's `backend/`, `assets/`, `defaults/` and `.vscode/` were removed (no binary backend, no default files; local deploy replaces the SSH tasks).

### 4.3 Design principles

- **One source of truth for the appid** (`core/appid.ts`); features only say where the data comes from.
- **One place that opens the store** (`core/store.ts`).
- **Settings are read at use time** from a cache, so toggling a feature in the panel works without reloading.
- **Every patch returns a handle** that `onDismount` releases. No orphan patches.
- **Steam-dependent constants and finders are isolated** in one file per feature, so a Steam update is fixed in one place.

---

## 5. The core: resolving the `appid`

### 5.1 Contract

`fromContextMenu(...)` for Feature A and `fromElement(focusedElement)` for Feature B. Both return an app or `null`, where `null` means "not an app capsule, do nothing".

### 5.2 From the context menu (Feature A)

The patch sits on the menu class itself (S0.2): inside the `afterPatch` on `prototype.render`, `this` is the menu instance [V], so the appid is read **directly from the instance**:

- `this.props.overview`: the capsule passes the full app overview when it opens the menu [VE, V].
- `this.GetTargetApps()`: the method Steam's own `render` uses to decide which apps the menu acts on. It returns `[overview]`, or every selected app with multi-select.
- **Rule:** insert the item only if `GetTargetApps()` returns **exactly one app** (the same criterion Steam uses for "Properties").
- `GetTargetApps` is feature-detected. Fallbacks, from the reference plugin's pattern: an object with `.app.appid` in the menu's children tree, then `_owner.pendingProps.overview.appid` (an older client shape; always `null` on the reference build).

**Derived rule:** the appid is **never captured once and reused**. It is derived at the last possible moment (when rendering the items of the menu being opened now), and `onSelected` closes over that value. No module-level appid shared between menus (R7). The reference plugin documents why: *"sometimes the one passed is cached from another context menu"*.

### 5.3 From the focused element (Feature B)

Result of S0.5 [V], Game Mode: the starting element is the capsule, either the `target` of the unhandled-button event (for the button) or `m_nodeForCurrentDescriptions.m_element` of the footer store (for the hint). From its React fiber (`getReactInstance`), walk up the `return` chain **at most 11 levels** looking for `memoizedProps.app.appid`. On the reference build the capsule has it at depth 10 on Home and every Library tab. With the context menu open only `overview.appid` exists, at depth 12–13, so the depth limit and the `app` prop exclude menus and page containers.

**Rule learned in H2:** never use `instanceof` on objects from Steam's window. Gamepad UI elements belong to another window (another JS realm), so `instanceof Object` is always false. Check the shape instead (`typeof x === "object"`).

### 5.4 Common validation (always, before acting)

1. `appid` is an integer > 0.
2. `appStore.GetAppOverviewByAppID(appid)` [V] is not null.
3. `overview.app_type` [V] is neither `Shortcut` (`1073741824`) nor `Invalid` (`0`).
4. If present, `overview.BIsModOrShortcut()` [V] returns `false` (Steam uses it itself in the "Manage" submenu; more robust than comparing types by hand).
5. `overview.appid === appid` (defence against data from another menu).

If validation fails: Feature A does not insert the item (the menu stays native); Feature B does nothing, or shows a short "no store page" toast on a non-Steam capsule if `unavailable_feedback` is on.

---

## 6. Opening the store page

### 6.1 Opening chain

The initial plan was `Navigation.NavigateToSteamWeb('steam://store/<appid>')`, which game-glance documents as what the native "Store Page" button opens. **S0.4 [V] on the reference build replaced it:** all four candidate methods open the store, but `NavigateToSteamWeb` with a `steam://` URL leaves **B** stuck on a blank `data:text/html` page. With an `https://` URL it works and B returns to the capsule. Final chain (`core/store.ts`):

| Order | Method |
|---|---|
| 1 | `Navigation.NavigateToSteamWeb('https://store.steampowered.com/app/<appid>/')`: Steam's web view, B returns to the capsule |
| 2 | `SteamClient.URL.ExecuteSteamURL('steam://store/<appid>')`: also opens `/routes/steamweb`, B returns |
| 3 | `Navigation.NavigateToExternalWeb('https://store.steampowered.com/app/<appid>/')`: Gamepad UI's external browser, B returns |

**Never pass `steam://` to `NavigateToSteamWeb`.** `SteamClient.Apps.ShowStore` also works but is only typed and adds nothing. `OpenInSystemBrowser` is never used (the system browser is the worst experience under gamescope). Only a missing function or a throw moves on to the next method; none of them reports failure synchronously.

S0.0 (g) [VE]: the native context menu has **no store entry**, so the plugin's item duplicates nothing in Steam.

### 6.2 Expected behaviour

- The call is wrapped in `safe()`.
- `Navigation.CloseSideMenus()` is not needed: the menu is gone 800 ms after navigating with every method (S0.4).
- B in the store returns to where the user was (the capsule).

### 6.3 Blank page on the first opening — PARKED

**Symptom:** after Steam's UI is restarted **from a console** (as happens during development), the **first** store opening leaves the web view blank; going back and opening again works for the rest of the session. It affects both features, since both go through `openStorePage`. **It does not happen after a normal shutdown or reboot**, so it is not considered a bug for real use and is parked.

What was learned, in case it comes back:

- The first opening **creates** the store web view (a new CEF target on its initial `data:text/html,<body></body>` URL) and the route changes to `/routes/steamweb`, but the store URL never loads. The second opening reuses the view and loads.
- Steam opens its own store through the same path (`NavigateToSteamWeb` → `/steamweb` route → the main window's lazily created store browser view, which only calls `LoadURL` once the view has history). There is no different native method to use instead.
- A first fix (pre-creating the view and waiting for its history before navigating) **did not help** and was removed. Destroying the view and navigating again ("simulated cold start") loads fine, so the cause is specific to the UI start-up.
- A log-only probe, `probes/blank-trace.js`, records `LoadURL`, request/load events and errors of the store view, route changes and the view state while on `/steamweb`. Procedure: restart the UI, install the probe without opening the store, open the store once (blank), go back, open again, and compare both sequences before deciding a fix.

**Lesson:** twice a fix was attempted blind. From then on: trace first, then fix (ground rule 7).

---

## 7. Feature A: context menu entry

### 7.1 Evidence

The most solid part of the project: decky-steamgriddb v1.8.1 (Oct 2026) inserts an item into this same menu and keeps code for the October 2025 client shape, so the pattern has survived at least one client change. Still fragile by nature (it depends on internal strings of Steam's bundle).

### 7.2 Finding `LibraryContextMenu` [V]

In `features/contextMenu/finder.ts`:

1. `findModuleByExport(e => e?.toString?.().includes('().LibraryContextMenu'))` → module.
2. From the module, the export whose source includes `navigator:` → functional wrapper.
3. `fakeRenderComponent(wrapper).type` → the patchable menu class.
4. Sanity check: `typeof prototype.GetTargetApps === 'function'`.

The string `().LibraryContextMenu` also appears in the storage drive menu; the `navigator:` filter picks the app menu. If any step fails, Feature A is marked **unavailable** in the panel and nothing is patched.

### 7.3 Patch layers [V]

Static analysis suggested one layer might be enough (the class's `render` returns the `Menu` with a flat array of items). **S0.3 + S0.4 showed two layers are needed:** in Home and Recent, editing `ret.props.children` is enough, but **in the Library tabs** the inner menu component receives **a new items array** through `shouldComponentUpdate` about 50 ms and 300 ms after mounting, without the outer `render` running again. Anything added in the outer layer disappears (it happens to other plugins too). The two-layer pattern was written from scratch:

- **Outer layer:** `afterPatch(LibraryContextMenu.prototype, 'render')`. Reaches the `Menu` element and, the first time, wraps its `type` (a function component) to get the inner class.
- **Inner layer**, on the inner class's prototype: `render` (items in `ret.props.children[0]`) and `shouldComponentUpdate` (items in `nextProps.children`, only when it returns `true`). On every pass: check it is an app menu (7.4), deduplicate by our `key`, derive the appid (5.2) and find the anchor again (its index changes between renders).
- **Every handle is kept** and released in `onDismount`, including the inner ones and the `type` wrapper (the reference plugin leaves some unreleased).
- **No state shared between menus** (5.2).

### 7.4 Recognising an app menu [V]

In the outer layer the patch is already on the app menu class, so the primary check is `this.props.overview` plus `GetTargetApps().length === 1`. **The inner layer is the generic menu component** shared by every Steam menu and submenu, so there it must recognise an app menu: the `AppProperties` anchor is present **or** some item's `onSelected` source contains `launchSource`. Shortcuts and mods are discarded with `BIsModOrShortcut()`. There is no multi-select in Game Mode, but the guard stays.

### 7.5 Where to insert [V]

"Properties…" is **not a direct child**: the last child of the items array is a `Fragment` `[separator, Properties item]`, rendered only for a single app outside kiosk mode; the item's `onSelected` calls `navigator.AppProperties(appid)`. Therefore:

- The anchor search goes one level deep: a direct child whose `onSelected` contains `AppProperties`, or a `Fragment` containing one.
- **The item is inserted just before that Fragment**, next to "Manage" and the other actions, with the separator still isolating "Properties" at the end.
- If the anchor is missing (kiosk mode, or a Steam change), the item is **appended explicitly at the end** and a debug line is logged. This avoids the reference plugin's latent bug: `splice(findIndex(...) = -1, 0, item)` inserts before the last element, not at the end (R10).
- **Coexistence with SteamGridDB:** it inserts its own item before "Properties" with the same criterion; the relative order depends on plugin load order. Deduplication only touches our own `key`, so neither plugin breaks the other (R14).

### 7.6 The item

- `MenuItem` from `@decky/ui`, fixed unique `key` (`store-shortcut-open-store`) for deduplication.
- `onSelected` → `safe(openStorePage(appid))`, with the appid from the closure of the same render pass.
- Localised label ("Go to store page").
- Not inserted if validation (5.4) fails.

### 7.7 Acceptance (milestone H1)

- The item appears on a capsule's menu in the Library grid, Home's recent games and collections. (Search results have no context menu in Game Mode, so that context does not apply.)
- Opening the menu on game A, closing it and opening it on B **does not mix appids**.
- Not shown for non-Steam games; the menu stays native.
- Disabling the feature in the panel (or unloading the plugin) removes it without restarting Steam.
- No new errors in the `SharedJSContext` console.
- Not shown with several capsules selected.
- Coexists with SteamGridDB: both items, no duplicates, both work.
- B in the store returns to the original view.

All passed in Game Mode on 2026-10-26 (`docs/device-checklist.md`, rows A1–A14).

### 7.8 License: the reference plugin is GPL-3.0

decky-steamgriddb is GPL-3.0, so **nothing is copied**. This document describes the *pattern* (which module to find, which layers to patch, which strings identify the menu), which is all that is needed. Copying literal GPL code would force the whole plugin under GPL-3.0, which contradicts the 0BSD decision (section 17). game-glance (MIT) was also only used as a reference for patterns.

---

## 8. Feature B: configurable button (L3 / R3)

Implemented in milestone H2 and validated in Game Mode (`docs/device-checklist.md`, rows B1–B8). Code: `src/features/buttonShortcut/` (`constants.ts`, `finder.ts`, `button.ts`, `footer.ts`, `logic.ts` with pure functions) and `fromElement` in `core/appid.ts`. The button and the hint start and fail separately, each with its own status in the panel.

### 8.1 Evidence before the spikes

No plugin was found that hooks L3/R3 on Valve's own library capsules, and neither reference plugin uses `RegisterForUnhandledButtonDownEvents`, `SetCatchAllGamepadInput` or `GetActiveActionDescriptions`. All of Feature B started as [T]/[H]. Verified in code: `GamepadButton` (exported at runtime) has `LSTICK_CLICK` and `RSTICK_CLICK`; the raw input layer uses a **different** enum (`GAMEPAD_LEFTSTICK_CLICK = 25`, `GAMEPAD_RIGHTSTICK_CLICK = 41`), and the two must not be mixed.

### 8.2 Candidate hooks

| ID | Mechanism | Pros | Risks |
|---|---|---|---|
| **H1** | `FocusNavController.RegisterForUnhandledButtonDownEvents(cb)` | Fires only for buttons **Steam did not handle**, so it cannot take over native functions; the event carries the target element | L3/R3 might not reach the navigation layer |
| H2 | Patching `FocusNavController.OnButtonDown` | Gets every press and the element | Intercepts all navigation input |
| H3 | `SteamClient.Input.RegisterForControllerInputMessages` | Raw layer | No element; fires everywhere |

`SetCatchAllGamepadInput` is never used: it captures all controller input and could break Steam's navigation.

**S0.0 a–b [VE]:** L3/R3 reach the navigation layer as `LSTICK_CLICK` (15) and `RSTICK_CLICK` (16), have no logical event and no library component consumes them, so they end up in the unhandled-event callbacks. **S0.6 [V], Game Mode: H1 is used.** It receives L3 and R3 with `is_repeat: false` and `target` = the focused capsule. It also fires with the context menu open, where the 5.3 rule returns `null`. H3 works too (25/41) but gives no element. Steam does nothing with L3/R3 in any view tested.

### 8.3 Behaviour rules

- Act only on the press, not on repeats.
- **Debounce of 400 ms** after a press that opened the store, to avoid double openings.
- **Act only if the resolver returns a valid appid** (focus on a Steam game's capsule). Anywhere else (menus, modals, the QAM, the game page) the hook does nothing.
- **Default button: L3** (author's decision), confirmed safe by S0.6. Configurable: Off / L3 / R3.
- Every registration returns a handle released in `onDismount`.
- `unavailable_feedback`: on a non-Steam capsule, a short toast explains why nothing happens.

### 8.4 The footer legend

Valve's capsules are Valve components: props such as `actionDescriptionMap` cannot be passed to them. The first candidates were F1 (patch the navigation node's action description methods), F2 (patch the library route with `createReactTreePatcher` and inject `actionDescriptionMap`) and F3 (no footer hint at all).

**S0.0 c–d [VE] ruled out F1 and F2:** the footer is a store that, on every focus change, reads the focused node's action descriptions and converts them from the navigation enum to **its own** footer enum. That conversion **has no case for L3/R3 and maps them to A**, so adding L3 to any `actionDescriptionMap` would **overwrite A's label**. However, the footer renders every button of its own enum that has a description, and it does have glyphs for `LeftStickClick` (17) and `RightStickClick` (19). Hence a new approach:

| ID | Approach | Status |
|---|---|---|
| **F4** (chosen) | Patch the footer store's prototype (`SetActionsFromMap`; class found with `findModuleExport` by its methods) to add `{LeftStickClick or RightStickClick: label}` when `this.m_nodeForCurrentDescriptions` is a Steam game's capsule. `SetActionsFromMap` drops keys missing from the new map, so the entry disappears by itself when the focus moves | **S0.7 [V]**: glyphs for L3/R3 appear and disappear with the focus, not on non-Steam capsules nor in the menu, and go away on unpatch |

The F3 fallback stayed available: the hard requirement was that the button opens the store; the hint was desirable, not blocking. Footer button names are looked up by name, not by number. Known nuance: right after the plugin loads, the hint appears on the first focus change (there is no footer store instance to refresh before that).

### 8.5 Acceptance (milestone H2)

- With a capsule focused, the configured button opens the right game's store page; B returns to the capsule.
- With focus outside a capsule (menus, QAM, game page), the button does nothing and does not break navigation.
- Changing the button in the panel (Off / L3 / R3) takes effect immediately.
- The hint appears with a Steam capsule focused and disappears when the focus moves.
- Unloading the plugin releases every hook (no ghost presses).

All passed in Game Mode on 2026-10-26/27.

---

## 9. Settings, panel and i18n

### 9.1 Settings schema

| Key | Type / values | Default | Description |
|---|---|---|---|
| `menu_item_enabled` | bool | `true` | Feature A |
| `shortcut_button` | `"off"` \| `"l3"` \| `"r3"` | `"l3"` | Feature B |
| `show_footer_hint` | bool | `true` | Footer hint (F4) |
| `unavailable_feedback` | bool | `true` | Toast on capsules without a store page |
| `language` | `"auto"` \| `"en"` \| `"fr"` \| `"es"` \| `"it"` \| `"de"` | `"auto"` | Plugin language |
| `debug_logging` | bool | `false` | Verbose logs with the `[StoreShortcut]` prefix |

Missing keys in saved settings take their default, so no migration is needed. `set_setting` rejects unknown keys and invalid values.

### 9.2 Backend (`main.py`, `api_version: 1`)

`class Plugin` with async methods taking positional arguments, instantiated by the loader. It only stores settings as JSON in `DECKY_PLUGIN_SETTINGS_DIR`: `get_settings()` and `set_setting(key, value)` (validated against the schema, returns the full dict). Backend errors reach the frontend as JS exceptions. Lifecycle methods as in the template.

### 9.3 Quick Access panel

`PanelSection`, `PanelSectionRow`, `ToggleField`, `DropdownItem` from `@decky/ui`; `titleView` with `quickAccessMenuClasses` (not `staticClasses`). Contents: Feature A toggle, shortcut button dropdown, footer hint toggle, notice toggle, language dropdown, debug toggle. **Per-feature status** visible to the user ("active" or "unavailable (reason)") so that a Steam update that breaks a finder shows up immediately instead of failing silently.

### 9.4 Settings cache

Loaded with `callable` at start-up, kept in memory, subscribers notified. Patches and hooks read the cache at use time, so panel changes apply without reloading and start-up never blocks on the backend (patches are installed synchronously in `definePlugin`).

### 9.5 i18n

Dictionaries in code: `en`, `fr`, `es`, `it`, `de`. Detection with `SteamClient.Settings.GetCurrentLanguage()` [V] (Steam's own language screen uses it): `english` → en, `french` → fr, `spanish`/`latam` → es, `italian` → it, `german` → de, anything else → en; `navigator.language` as an extra fallback.

---

## 10. Resilience, logging and Steam updates

- **`safe(fn, context)`** wraps every handler Steam can call (patched renders, input hooks, `onSelected`): it catches, logs and returns the original value. **Nothing propagates into Steam's render.**
- **Self-diagnosis at start-up:** each feature records `{available, reason}`; the panel shows it.
- **Idempotence:** `onDismount` releases every patch and hook and is safe to call more than once.
- **Logging:** `console` with the `[StoreShortcut]` prefix in the frontend (`SharedJSContext` console), `decky.logger` in the backend. Verbose only with `debug_logging`.
- **When a Steam update breaks something:** (1) the panel shows which feature failed; (2) re-run the spikes with `scripts/cdp.mjs` to see what changed; (3) update the fixtures and the recognition criteria (finder strings, prop names) in the feature's constants file; (4) the unit tests with fixtures protect the rest.

---

## 11. Phase 0: discovery spikes

**Purpose:** turn every [T]/[H] into [V] or "discarded" directly on the device, before writing plugin code. This replaces the test environment that does not exist for Steam's internals.

**Order:** S0.0 first, **static** (reading the client's UI bundle, no controller, no patches). Then the runtime spikes, run with the CDP helper (13.5) by injecting **probes** (`probes/*.js`) into `SharedJSContext`, without touching the installed plugin. Patching probes are log-only unless stated, temporary, and always removed with their `unpatch`.

| ID | Goal | Decides |
|---|---|---|
| **S0.0** | Static analysis of the Steam UI bundle (11.1) | Narrows the rest; promotes [T]/[H] to [VE] or discards them |
| **S0.1** | Environment: `window.DFL` and every needed export present | Redesign of any missing piece |
| **S0.2** | `LibraryContextMenu` finder (7.2) | Feature A availability |
| **S0.3** | Real shape of the appid in the menu, in every context | `fromContextMenu`; fixtures in `test/fixtures/` |
| **S0.4** | Opening the store with each candidate method; B behaviour | `openStorePage` chain |
| **S0.5** | Resolver from the focused element | `fromElement` |
| **S0.6** | Button hooks H1–H3 as loggers, L3/R3 in every view | Hook choice and default button |
| **S0.7** | Footer legend | Final scope of Feature B |
| **S0.8** | Developing from the desktop session | Working method (13.6) |

### 11.1 S0.0: static analysis of the client

The client stores its UI as minified JS under `~/.steam/steam/steamui/`; property names and string literals survive minification. Searches were done with bounded windows (Python, since lines are huge), looking for: the unhandled-button machinery (a), L3/R3 in the button translation tables (b), how the footer reads action descriptions (c), footer glyphs for stick clicks (d), the strings Feature A relies on (e), the props passed when opening the menu (f), store URLs (g) and `GetCurrentLanguage` (h).

**Rules:** no Valve code is copied into the repository or any published document, only identifiers, short strings and prose descriptions. Each finding is tagged [VE] with the client build: a static finding does not replace a runtime spike.

### 11.2 Spike results (Steam build `1792618285`, Decky 3.3.0)

| Spike | Result |
|---|---|
| S0.0 e | `().LibraryContextMenu` in two modules (app menu and storage drive menu); `launchSource` and `AppProperties` present. Anchor structure in 7.5 |
| S0.0 f | The menu opens with `overview`, `client`, `launchSource`, `bInGamepadUI`, `strCollectionId`, `includeMultiSelect`, `hasCustomArtwork`, `onChangeArtwork`, `ownerWindow`, `omitPrimaryAction`, `additionalActions`. Multi-select through `GetTargetApps()` |
| S0.0 g | The client builds `steam://store/<appid>` itself; no native store entry in the menu |
| S0.0 h | `SteamClient.Settings.GetCurrentLanguage()` used by Steam's language screen |
| S0.1 | `window.DFL` has every export needed; `appStore.GetAppOverviewByAppID` works and `BIsModOrShortcut` is a function |
| S0.2 | The three finder steps work; the class has `render` and `GetTargetApps` |
| S0.3 | One `render` per opening; `overview` = `GetTargetApps()[0]`; the old `_owner` shape is always `null`. `ret` = `Menu` with a flat array; last child = Fragment `[separator, Properties]`. Shortcuts get the same menu and `BIsModOrShortcut()` → `true`. No multi-select in Game Mode |
| S0.4 | Opening chain revised (6.1). No `CloseSideMenus` needed. **Two patch layers required** (7.3) |
| S0.8 | Decky injects into the desktop session's `SharedJSContext`, but final validation is always in Game Mode (13.6) |
| S0.0 a–d | L3/R3 reach the unhandled-event path → H1. No library component uses L3/R3. Nav→footer conversion maps L3/R3 to A (F1/F2 discarded); footer glyphs for L3/R3 exist → F4 |
| S0.5 | One footer store instance; `m_nodeForCurrentDescriptions.m_element` is the capsule (DOM focus agrees). `app.appid` at depth 10 on Home and every Library tab; only `overview.appid` at depth 12–13 with the menu open |
| S0.6 | H1 receives L3 (15) and R3 (16) with `target` = the focused capsule; also fires with the menu open (resolver returns `null` there). Steam does nothing with L3/R3: **L3 default confirmed** |
| S0.7 | **F4 works**: L3/R3 glyphs in the footer, follow the focus, absent for non-Steam and in the menu, removed on unpatch |

Full details: `docs/PHASE0-FINDINGS.md`.

---

## 12. Milestones

| Milestone | Content | Exit criterion |
|---|---|---|
| **H0-F1** | Toolchain, repo from the template, cleanup, `lint:legacy`, `cdp.mjs`, `deploy.sh`, Phase 1 spikes | Findings in `PHASE0-FINDINGS.md`; the empty plugin loads in Decky |
| **H1** | Core, settings backend, minimal panel, i18n, **Feature A** | Acceptance 7.7; resolver unit tests on fixtures green |
| **H3-F1** | Hardening of Phase 1: per-feature status, patch cleanup, device checklist, README, license | **End of Phase 1 (v1.0.0)** |
| **H0-F2** | Phase 2 spikes (S0.0 a–d, S0.5–S0.7) | Hook and footer decisions documented |
| **H2** | **Feature B**: hook from S0.6, footer from S0.7 | Acceptance 8.5 |
| **H3-F2** | Hardening of Feature B | **End of Phase 2 (v1.1.0)**; full checklist in Game Mode |
| **H4** | Publication | Public repository with README and LICENSE, GitHub releases; Plugin Store submission |

### 12.1 Progress log (summary)

- **2026-10-25, H0-F1.** Repo created from the template, cleanup done, `lint:legacy` as `prebuild` (checked to fail on `staticClasses`), lockfile 9.0, `deploy.sh` installs to `~/homebrew/plugins/Store-Shortcut` and Decky loads it. `cdp.mjs` uses Node 24's built-in WebSocket (no `ws` dependency). Probes for status, heartbeat, S0.3, S0.4 and uninstalling. Verified live that Decky's `afterPatch` calls the handler with the patched instance as `this`. Working method 13.6 (d) validated, then S0.3 and S0.4 done in Game Mode.
- **2026-10-25/26, H1.** Core, Feature A with the two-layer patch, settings backend, panel and i18n; unit tests on the S0.3 fixtures.
- **React error #185 (open, not reproduced).** Seen once: with a store page open, disabling the plugin in Decky and pressing B broke the whole UI with React's "maximum update depth" error. A reproduction attempt on 2026-10-26 did not fail, **but was not conclusive**: the recording showed the plugin was never actually unloaded. Treated as a possible one-off; if it comes back, first check that the recording contains the plugin's `unloaded` line. Open suspicions: unpatching the shared inner menu component while a menu is mounted, and the patch chain shared with SteamGridDB on the same component. As part of H3-F1 the handle of the `element.type` wrapper is now kept and released.
- **2026-10-26, end of Phase 1: v1.0.0.** Device checklist A1–A14 passed in Game Mode (search results have no context menu in Game Mode; no collections to test A4). No console errors. French, Italian and German added after the checklist.
- **2026-10-26, Phase 2 spikes:** S0.0 a–d, S0.5–S0.7 (results in 11.2).
- **2026-10-26/27, H2.** Feature B complete. **Bug found and fixed:** the fiber lookup checked `element instanceof Object`; Gamepad UI elements come from another JS realm, so it was always false and neither the button nor the hint ever found a capsule (rule in 5.3). Device checklist B1–B8 passed.
- **2026-10-26/27, blank first page (6.3).** Investigated with `watch-targets` and `blank-trace`; a fix attempt did not help and was removed; parked once it was clear it only happens after restarting Steam's UI from a console.
- **2026-10-27, end of Phase 2: v1.1.0.** README for both features. `safe(...)` restored around `openStorePage` in the menu item's `onSelected`. Checked in Game Mode: one hint, one navigation per press, menu OK.
- **2026-10-27, H4.** Public repository. v1.1.1: `flags: []`, release packaging (`scripts/package.sh` → `out/Store-Shortcut-vX.Y.Z.zip`), GitHub release. v1.1.2: store image (`docs/store-image.png`, real Game Mode screenshots) as `publish.image`. Plugin Store requirements reviewed; submission prepared.
- **2026-10-28, v1.1.3.** This English edition of the design document added to `docs/`. No code changes.

---

## 13. Development environment

### 13.1 Prerequisites

1. Decky Loader installed, with **developer mode** on (Decky settings → General).
2. Local CEF debugging port 8080 working (Decky needs it anyway): `curl -s http://localhost:8080/json`. If it does not answer, create an empty `~/.steam/steam/.cef-enable-remote-debugging` and restart Steam.
3. **Do not enable "Allow Remote CEF Debugging"** (forwarding to port 8081) unless debugging from another machine: anyone on the network gets full debugger access.
4. `sudo` for deploying (plugins live in a root-owned folder).

### 13.2 Toolchain

Everything in `$HOME`, without touching the immutable root filesystem: Node 24 (`brew install node@24`, keg-only, so add its `bin` to `PATH`), pnpm 9 through corepack (pinned with `"packageManager": "pnpm@9.15.9"`), git. Docker is not needed (no compiled backend).

### 13.3 Project setup

From decky-plugin-template: `plugin.json` with `name`, `author`, `flags` (required; `["debug"]` during development so the loader re-imports the plugin, `[]` for release), `"api_version": 1`, `publish`. No `root` flag. `package.json` with `"type": "module"`, `"license": "0BSD"`, scripts `lint:legacy`, `test`, `deploy`, `cdp`.

### 13.4 Local deploy (`scripts/deploy.sh`)

1. `lint:legacy` and `pnpm run build`.
2. **Copy, do not symlink**, only what a plugin zip contains (`dist/`, `main.py`, `plugin.json`, `package.json`, `LICENSE`, `README.md`) to `~/homebrew/plugins/Store-Shortcut/` with `sudo rsync -a --delete`. A symlink is avoided because the loader may `chown`/`chmod` the plugin folder recursively.
3. `sudo systemctl restart plugin_loader` (reloads every plugin).

### 13.5 CDP helper (`scripts/cdp.mjs`)

Dev-only, not shipped. Same mechanism as Decky's injector: `GET http://localhost:8080/json`, pick the `SharedJSContext` target, WebSocket + `Runtime.evaluate`. Subcommands: `targets`, `eval <js|file>`, `probe <file>`, `record <file>` (console messages and uncaught exceptions with timestamps, optionally filtered by tag), `watch-targets` (polls `/json`, survives Steam restarts). A safe serialiser (bounded depth, no cycles, skips `_owner`, `stateNode`, `alternate`). **Any dump that goes to `docs/` or `test/fixtures/` is sanitised**: no SteamIDs, account names or personal library listings.

### 13.6 Where the development tools run

Game Mode has no terminal. Options considered: (a) desktop mode with Steam in Big Picture; (b) SSH from another computer; (c) a log-only probe built into a dev build of the plugin; **(d), chosen: Game Mode on its VT and the dev tools on a text console** (`Ctrl+Alt+F3`). Steam is not restarted when switching VT, so probes can be injected over CDP into Game Mode's Steam and iterated without building or deploying. Each spike follows the same loop:

1. Install the log-only probe over CDP and start a background **recorder** (`cdp.mjs record`).
2. Switch to Game Mode and perform a **predefined sequence of actions** with the controller.
3. Back on the console, read the recording, compare it with the sequence, and remove the probe.

Smoke-tested before use: gamescope gives up the VT, image and controller come back without a black screen, and `SharedJSContext` keeps answering over CDP while Game Mode is in the background. Details in `docs/SPIKES-RUNBOOK.md`. **Final validation is always in Game Mode with a real controller.**

### 13.7 Work loop

Edit → `lint:legacy` and types (`pnpm run build`, TypeScript strict) → unit tests → `deploy.sh` → watch the console recording and the backend log → test on the device.

---

## 14. Testing strategy without a test environment

1. **Unit tests with fixtures** (Vitest, dev only): the context menu resolver on the real, sanitised menu structures captured in S0.3, validation 5.4, Feature B's pure logic (fiber walk and footer map on synthetic shapes modelled on S0.5), settings validation, language mapping. This is the safety net against Steam changes.
2. **What cannot be tested offline** (finders on the live webpack, input hooks, patches): covered by the self-diagnosis (section 10) and by re-running the spikes.
3. **Manual device checklist** (`docs/device-checklist.md`): each row is context × feature × expected result, with status and date. Contexts: Library grid, Home recent games, collections, non-Steam game, two menus in a row, button change in the panel, plugin unload, coexistence with SteamGridDB, game detail page.
4. **After every Steam or Decky update:** re-run the checklist and spikes S0.2, S0.3 and S0.5; if the fixtures change, update them and re-run the tests.

---

## 15. Publication

- **GitHub:** public repository with README and LICENSE; each version as a GitHub release with the plugin zip (installable from Decky's developer mode).
- **Decky Plugin Store** ([review guide](https://wiki.deckbrew.xyz/en/plugin-dev/review-and-testing)): the plugin goes in as a git submodule under `plugins/<name>` of decky-plugin-database, pinned to a commit; the store builds it from source in CI (`pnpm i --frozen-lockfile`). Requirements met: lockfile 9.0, no unused template folders, `publish.image` as a reachable PNG, version bump on every submission, no remote code or network requests (the plugin makes none of its own), license in `LICENSE`. Third-party testing on SteamOS Stable/Beta is part of the review, since development happened on Bazzite.

---

## 16. Risks and mitigations

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R1 | A Steam update changes the context menu structure | Medium / high for A | Several appid strategies (5.2), fixtures, fail-open, status in the panel, reusable probes |
| R2 | Finder strings change (`().LibraryContextMenu`, `navigator:`, `launchSource`, `AppProperties`) | Medium / high | One constants file per feature; a missing string disables the feature without breaking anything |
| R3 | The user's loader `@decky/ui` differs from the typings | Medium / medium | Feature detection; no deprecated exports |
| R4 | Steam already uses L3/R3 in the library | Medium / medium | H1 only gets unhandled buttons; S0.6 confirmed they are free; configurable |
| R5 | Footer hint not viable | Medium-high / low | F3 fallback (resolved: F4 works) |
| R6 | Button hook fires outside the library | Medium / medium | Resolver returns `null` outside a capsule; debounce |
| R7 | Appids mixed between consecutive menus | Medium / high | No shared state; derived at the last moment; explicit acceptance test |
| R8 | Non-Steam games, tools, DLC, delisted games | High / low | Validation 5.4; item hidden; optional toast |
| R9 | Leaked patches on unload or reload | Medium / medium | Every handle released in `onDismount`; idempotent |
| R10 | `splice(-1)` when the "Properties" anchor is missing | Low / low | Explicit append at the end (7.5) |
| R11 | GPL code contamination from the reference | Low / high (legal) | Pattern reimplemented from prose; 0BSD |
| R12 | Deprecated APIs copied from old examples | Medium / high | `lint:legacy` on every build |
| R13 | `NavigateToSteamWeb` changes or fails | Low / medium | Fallback chain (6.1) |
| R14 | Conflict with SteamGridDB on the same menu | Medium / medium | Dedupe only our own `key`; anchor found inside the Fragment; acceptance test |
| R15 | Multi-select: opening one game's store when the menu acts on several | Medium / low | Insert only if `GetTargetApps()` returns one app |

---

## 17. Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Name | **Store Shortcut** (folder `Store-Shortcut`, package `decky-store-shortcut`) |
| 2 | License | **As permissive as possible**: 0BSD for the project's own code |
| 3 | Default button | **L3** (confirmed free by S0.6) |
| 4 | Non-Steam games in the menu | **Hide** the item (the menu stays native) |
| 5 | Publication | First for personal use, then public for anyone to do whatever they want with it |
| 6 | Phases | Phase 1 = Feature A only; Feature B as Phase 2 once Phase 1 works |
| 7 | Languages | English, French, Spanish, Italian, German, auto-detected |
| 8 | Blank first page (6.3) | Parked: only after restarting Steam's UI from a console |

**Why 0BSD:** no conditions at all (not even attribution), and a real license rather than a public-domain dedication, which works poorly in jurisdictions where some author's rights cannot be fully waived (such as Spain). Three caveats no license of ours can remove:

1. `LICENSE` keeps the template's **BSD-3-Clause notice** at the bottom, since files derived from the template remain.
2. **`@decky/api` (LGPL-2.1) is bundled** into `dist/index.js`; that does not make our code LGPL, but its license still covers its part of the bundle (stated in the README). `@decky/ui` is not bundled; the loader provides it.
3. **No GPL code** is incorporated (7.8); any MIT code would keep its notice.

---

## Appendix A: symbol reference and status

### `@decky/api` (bundled; Decky ≥ 3.0)

| Symbol | Status | Use |
|---|---|---|
| `definePlugin` | [V] | Entry point |
| `callable` | [V] | `get_settings`, `set_setting` |
| `toaster.toast` | [V] | "No store page" notice |
| `routerHook` | [V] | Not used (F2 discarded) |

### `@decky/ui` (provided at runtime by the loader as `window.DFL`)

| Symbol | Status | Use |
|---|---|---|
| `afterPatch` | [V] | Patches (7.3, 8.4) |
| `fakeRenderComponent` | [V] | Finder (7.2) |
| `findModuleByExport`, `findModuleExport` | [V] | Finders |
| `getReactInstance` | [V] | Resolver from element (5.3) |
| `getFocusNavController` | [V] | Feature B hook |
| `MenuItem` | [V] | Feature A item |
| `Navigation.NavigateToSteamWeb(https)`, `.NavigateToExternalWeb(https)` | [V] in Game Mode; `NavigateToSteamWeb(steam://)` breaks B (S0.4) | `core/store` |
| `PanelSection`, `PanelSectionRow`, `ToggleField`, `DropdownItem`, `quickAccessMenuClasses` | [V] | Panel |
| `EAppType` and other `globals` enums | **Not exported at runtime** [V] | Local constants |

### Steam globals

| Symbol | Status | Use |
|---|---|---|
| `appStore.GetAppOverviewByAppID(appid)` | [V] | Validation 5.4 |
| `overview.appid`, `.app_type`, `.BIsModOrShortcut()` | [V] | Validation 5.4 |
| `FocusNavController.RegisterForUnhandledButtonDownEvents` | [V] (S0.6): L3 = 15, R3 = 16, `target` = focused element | Feature B button |
| `SteamClient.URL.ExecuteSteamURL('steam://store/<id>')` | [V] (S0.4) | Fallback 2 (6.1) |
| `SteamClient.Apps.ShowStore` | [V] works (S0.4) | Not used |
| `SteamClient.Input.RegisterForControllerInputMessages` | [V] works (L3 = 25, R3 = 41), no element | Not used |
| `SteamClient.Settings.GetCurrentLanguage` | [V] | i18n |
| Main window store browser view (`GetStoreBrowser`, `LoadURL`, `History`) | [V] live | 6.3 investigation only |

### Steam internals (fragile by nature)

| Item | Status |
|---|---|
| Finder `().LibraryContextMenu` + `navigator:` + `fakeRenderComponent(...).type` | [V] live (S0.2) |
| Menu instance `this.props.overview`, `this.GetTargetApps()` | [V] Game Mode (S0.3) |
| Items in the inner `render`'s `ret.props.children[0]` and the inner `shouldComponentUpdate`'s `nextProps.children` | [V]; required in the Library (S0.4) |
| `launchSource` (app menu) and `AppProperties` (anchor, inside a Fragment `[separator, Properties]`) | [V] + [VE] |
| `app.appid` in the capsule's fiber at depth 10 | [V] (S0.5) |
| Gamepad UI elements are from another realm: `instanceof` is always false | [V] (H2 bug) |
| Footer store (`SetActionsFromMap`, `UpdateForFocusedNode`, `m_nodeForCurrentDescriptions`), own enum with `LeftStickClick` / `RightStickClick` | [VE] + [V] (S0.7) |
| Nav→footer conversion maps L3/R3 to A | [VE] (S0.0 c) |

### Python (`decky`)

`decky.logger`, `decky.DECKY_PLUGIN_SETTINGS_DIR` and the other `decky.pyi` constants: [V].

---

## Appendix B: sources

Documentation:

- [New API migration guide](https://wiki.deckbrew.xyz/en/plugin-dev/new-api-migration)
- [Getting started](https://wiki.deckbrew.xyz/en/plugin-dev/getting-started)
- [Review and testing](https://wiki.deckbrew.xyz/en/plugin-dev/review-and-testing)
- [CEF debugging](https://wiki.deckbrew.xyz/plugin-dev/cef-debugging)
- [Route patching](https://wiki.deckbrew.xyz/plugin-dev/route-patching) (outdated: uses `serverApi`)

Source code read (2026-10-25):

- [decky-plugin-template](https://github.com/SteamDeckHomebrew/decky-plugin-template)
- [decky-frontend-lib](https://github.com/SteamDeckHomebrew/decky-frontend-lib) (`@decky/ui` 4.16.0)
- [loader-api](https://github.com/SteamDeckHomebrew/loader-api) (`@decky/api` 1.1.3)
- `@decky/rollup` 1.0.2 (npm)
- [decky-loader](https://github.com/SteamDeckHomebrew/decky-loader) (`00cd202`)
- [decky-steamgriddb](https://github.com/SteamGridDB/decky-steamgriddb) v1.8.1 (GPL-3.0): pattern only, no code copied
- [game-glance](https://github.com/michpalm/game-glance) v3.5.0 (MIT): pattern only
