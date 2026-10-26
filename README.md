# Store Shortcut

Decky Loader plugin for Steam Game Mode: adds **"Go to store page"** to the context
menu of a library capsule, so you can open a game's store page without entering
its game page first.

Status: **v1.0.0, Phase 1 done.** The context menu entry works in Game Mode.
Languages: English, French, Spanish, Italian and German (follows Steam by default).

- Phase 1: context menu entry. Shown only for Steam games (hidden for non-Steam
  shortcuts and when several games are selected). Can be turned off in the plugin's
  panel, which also shows whether the entry is active or why it is unavailable.
- Phase 2 (next): configurable L3/R3 shortcut with a footer hint.

Store pages open in Steam's own web view; **B** returns to where you were.
The plugin makes no network requests of its own.

Device checks: `docs/device-checklist.md`.

## Development

Requirements: Decky Loader ≥ 3.0 with developer mode, Node 24 (`brew install node@24`),
pnpm 9 (`corepack enable`).

```sh
export PATH=/home/linuxbrew/.linuxbrew/opt/node@24/bin:$PATH
pnpm install
pnpm run build          # runs lint:legacy first
pnpm run deploy         # build + copy to ~/homebrew/plugins/Store-Shortcut + restart Decky
pnpm run cdp targets    # dev helper for the Steam CEF debugger (see scripts/cdp.mjs)
```

Spikes and probes: see `docs/SPIKES-RUNBOOK.md` and `docs/PHASE0-FINDINGS.md`.

## License

0BSD for this project's own code. Files derived from decky-plugin-template keep
its BSD-3-Clause notice (both in `LICENSE`). The built bundle includes
`@decky/api`, which is LGPL-2.1.
