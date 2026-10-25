# Runbook: Phase 1 runtime spikes (S0.3, S0.4)

Method 13.6 (d) of the design doc: Game Mode runs on its VT; Claude Code runs on a text
console (TTY). Probes are injected over CDP into Game Mode's Steam (nothing is built or
deployed). A background recorder writes their console output to a file while the author
uses the controller; Claude Code reads it afterwards.

Setup for Claude Code (inside the TTY):

```sh
cd ~/dev/decky-store-shortcut
export PATH=/home/linuxbrew/.linuxbrew/opt/node@24/bin:$PATH
mkdir -p .spikes
loginctl list-sessions; loginctl show-session <id> -p VTNr -p Type -p Desktop   # find Game Mode's VT
```

Tell the author which VT Game Mode is on (`Ctrl+Alt+F<n>` to go back, or `sudo chvt <n>`).

Always: start the recorder **in the background** before the author leaves the TTY, e.g.
`node scripts/cdp.mjs record .spikes/<step>.jsonl --filter SS-PROBE`, and stop it (SIGTERM)
when they come back. Always finish with `node scripts/cdp.mjs probe uninstall`.

## Step 1: smoke test of the method

1. `node scripts/cdp.mjs probe status`: `dfl` must be `object`; `href` must be Game Mode's UI.
2. `node scripts/cdp.mjs probe heartbeat` and start the recorder (`.spikes/smoke.jsonl`).
3. Author: switch to Game Mode, check that image and controller work, wait ~20 s, come back.
4. Check: heartbeats keep coming with no gaps while away (note `hidden`); no black screen
   or lost controller on return. Remove the probe.
5. If anything fails, record it in `PHASE0-FINDINGS.md` and switch to method 13.6 (c).

## Step 2: S0.3, menu shape

Install `s03-contextmenu`, start the recorder (`.spikes/s03.jsonl`). Give the author this
sequence and ask them to note any step they could not do (e.g. no non-Steam game):

1. Library → All games grid: open the menu (☰ / Options button) on Steam game **A**, close it.
2. Same grid: open the menu on Steam game **B**, close it.
3. Home → recent games row: open the menu on a game, close it.
4. Library → a collection: open the menu on a game, close it.
5. Search: search a game, open the menu on the result, close it.
6. A **non-Steam** game (shortcut): open the menu, close it.
7. A tool (Proton / Steam Linux Runtime) if visible in the library: open the menu, close it.
8. An **uninstalled** Steam game: open the menu, close it.
9. If Game Mode offers multi-select anywhere: select two games and open the menu.

Analyse per step: `getTargetApps`, `overview.appid`, `strategy1/2`, `liveCheck`,
`ret.type`, `childrenIsArray`, `anchorIdx`, items list (look for SteamGridDB's item), and how
many renders happen per menu (`seq`). Save sanitized fixtures to `test/fixtures/` (no
game names, no SteamIDs). Decide: one patch layer or two (design 7.3), anchor logic (7.5),
whether the `launchSource` check is needed (7.4).

## Step 3: S0.4, opening the store

Install `s04-store` (adds four temporary `[S0.4] M1…M4` entries at the end of the menu),
start the recorder (`.spikes/s04.jsonl`). Sequence, for **each** method M1 → M4 and on a
known owned Steam game:

1. Open the menu on the game, choose `[S0.4] Mx`.
2. Note: did the store page open? In which browser (Steam's own overlay/web view, or something else)?
   Did the context menu close by itself?
3. Press **B**: where did you land (same capsule focused? another place?).

Then, with M1 only: an uninstalled game, a game delisted from the store (if any), and a
DLC-heavy game (check the right page opens). The probe does not add entries to non-Steam
games; confirm that.

Decide the `openStorePage` chain and whether `Navigation.CloseSideMenus()` is needed (design 6.1–6.2).

## After the spikes

Update `PHASE0-FINDINGS.md`, design doc 11.2 and Appendix A; then start H1.
