// Every value that depends on Steam's internal code lives here (design 4.3, R2):
// when a Steam update breaks Feature B, this is the first file to check.
// Verified on build 1792618285 (PHASE0-FINDINGS, S0.0 a–d and S0.5–S0.7).

// Navigation-layer button ids as they reach RegisterForUnhandledButtonDownEvents (S0.6).
export const NAV_BUTTON = { l3: 15, r3: 16 } as const;

// Footer action store (S0.0 c): the class is found by these prototype methods.
export const FOOTER_STORE_METHODS = ["SetActionsFromMap", "UpdateForFocusedNode"] as const;

// The footer has its own button enum (S0.0 d); its L3/R3 members, looked up by name.
export const FOOTER_BUTTON_NAMES = { l3: "LeftStickClick", r3: "RightStickClick" } as const;

// Ignore a second press this soon after one that opened the store (8.3).
export const DEBOUNCE_MS = 400;
