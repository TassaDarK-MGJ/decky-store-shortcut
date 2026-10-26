// Local copies of Steam constants: the enums in @decky/ui globals are types only
// and do not exist at runtime (design 3.2.4).
export const EAppType = {
  Invalid: 0,
  Shortcut: 1073741824,
} as const;

// The subset of SteamAppOverview this plugin reads. Kept minimal so the core can be
// unit-tested without Steam.
export interface AppOverviewLike {
  appid: number;
  app_type?: number;
  BIsModOrShortcut?: () => boolean;
}

export type OverviewLookup = (appid: number) => AppOverviewLike | null | undefined;
