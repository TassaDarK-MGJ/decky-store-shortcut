// Self-diagnosis shown in the panel (design 10): one per feature, so a Steam update
// that breaks a finder is visible instead of failing silently.
export type FeatureStatus = { state: "active" } | { state: "unavailable"; reason: string };
