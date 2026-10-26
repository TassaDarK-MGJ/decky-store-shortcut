import { Navigation } from "@decky/ui";
import { log } from "./log";

// Single place that opens the store (design 6). Order decided in S0.4:
// never pass steam:// to NavigateToSteamWeb, it leaves B stuck on a data: page.
export function storeUrl(appid: number): string {
  return `https://store.steampowered.com/app/${appid}/`;
}

type Opener = [name: string, available: () => boolean, open: (appid: number) => void];

// @decky/ui types SteamClient.URL as the DOM's URL (its own interface is not
// imported there), so this local shape stands in for it.
interface SteamUrlApi {
  ExecuteSteamURL?: (url: string) => void;
}
const steamUrlApi = () => window.SteamClient?.URL as unknown as SteamUrlApi | undefined;

const OPENERS: Opener[] = [
  [
    "NavigateToSteamWeb",
    () => typeof Navigation?.NavigateToSteamWeb === "function",
    (appid) => Navigation.NavigateToSteamWeb(storeUrl(appid)),
  ],
  [
    "ExecuteSteamURL",
    () => typeof steamUrlApi()?.ExecuteSteamURL === "function",
    (appid) => steamUrlApi()!.ExecuteSteamURL!(`steam://store/${appid}`),
  ],
  [
    "NavigateToExternalWeb",
    () => typeof Navigation?.NavigateToExternalWeb === "function",
    (appid) => Navigation.NavigateToExternalWeb(storeUrl(appid)),
  ],
];

// Returns true when some method accepted the call. None of them reports failure
// synchronously, so only a missing function or a throw moves on to the next one.
export function openStorePage(appid: number): boolean {
  for (const [name, available, open] of OPENERS) {
    if (!available()) {
      log.warn(`${name} not available, trying the next method`);
      continue;
    }
    try {
      open(appid);
      log.debug(`store page for ${appid} opened with ${name}`);
      return true;
    } catch (e) {
      log.error(`${name} failed for ${appid}:`, e);
    }
  }
  log.error(`could not open the store page for ${appid}`);
  return false;
}
