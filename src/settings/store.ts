// Settings cache (design 9.4): patches read it at use time, so panel changes apply
// without reloading, and startup never waits for the backend.
import { callable } from "@decky/api";
import { useEffect, useState } from "react";
import { log } from "../core/log";
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from "./schema";

const getSettingsRpc = callable<[], Settings>("get_settings");
const setSettingRpc = callable<[key: string, value: unknown], Settings>("set_setting");

let current: Settings = { ...DEFAULT_SETTINGS };
const listeners = new Set<(s: Settings) => void>();

function apply(raw: unknown): void {
  current = sanitizeSettings(raw);
  for (const fn of listeners) {
    try {
      fn(current);
    } catch (e) {
      log.error("settings listener failed:", e);
    }
  }
}

export function getSettings(): Settings {
  return current;
}

export function subscribeSettings(fn: (s: Settings) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function loadSettings(): Promise<void> {
  try {
    apply(await getSettingsRpc());
  } catch (e) {
    log.error("could not load settings, using defaults:", e);
    apply(DEFAULT_SETTINGS);
  }
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  try {
    apply(await setSettingRpc(key, value));
  } catch (e) {
    log.error(`could not save ${key}:`, e);
  }
}

export function useSettings(): Settings {
  const [settings, setSettings] = useState(current);
  useEffect(() => subscribeSettings(setSettings), []);
  return settings;
}
