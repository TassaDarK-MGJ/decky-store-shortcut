# Store Shortcut

Decky Loader plugin for Steam Game Mode: adds **"Go to store page"** to the context
menu of a library capsule, so you can open a game's store page without entering
its game page first.

Status: **H0, skeleton.** The plugin loads but has no features yet.

- Phase 1: context menu entry (in progress).
- Phase 2: configurable L3/R3 shortcut with a footer hint.

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
