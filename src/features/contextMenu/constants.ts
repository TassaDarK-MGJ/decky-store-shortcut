// Every string that depends on Steam's internal code lives here (design 4.3, R2):
// when a Steam update breaks Feature A, this is the first file to check.
// Verified on build 1792618285 (PHASE0-FINDINGS, S0.0–S0.4).

// Finder (7.2): source text of the library app context menu module and its wrapper.
export const LIBRARY_CONTEXT_MENU_MARKER = "().LibraryContextMenu";
export const NAVIGATOR_MARKER = "navigator:";

// App menu recognition (7.4): text inside native onSelected handlers.
export const LAUNCH_SOURCE_MARKER = "launchSource";
// Anchor (7.5): the "Properties…" item, inside a [separator, Properties] Fragment.
export const APP_PROPERTIES_MARKER = "AppProperties";

// React key of our item, also used to dedupe it (7.6).
export const ITEM_KEY = "store-shortcut-open-store";
