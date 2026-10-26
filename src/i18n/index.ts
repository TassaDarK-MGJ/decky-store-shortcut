// i18n (design 9.5): two in-code dictionaries, language from the setting or, on
// "auto", from Steam's own language.
import { en, type StringKey, type Strings } from "./en";
import { es } from "./es";

export type Lang = "en" | "es";
export type LanguageSetting = "auto" | Lang;

const DICTS: Record<Lang, Strings> = { en, es };

// steamLanguage: SteamClient.Settings.GetCurrentLanguage() ("spanish", "latam",
// "english"…). browserLanguage: navigator.language as a last resort.
export function resolveLanguage(setting: LanguageSetting, steamLanguage?: string | null, browserLanguage?: string | null): Lang {
  if (setting === "en" || setting === "es") return setting;
  if (steamLanguage) return steamLanguage === "spanish" || steamLanguage === "latam" ? "es" : "en";
  return browserLanguage?.toLowerCase().startsWith("es") ? "es" : "en";
}

let current: Lang = "en";

export function setLanguage(lang: Lang): void {
  current = lang;
}

export function t(key: StringKey, vars?: Record<string, string>): string {
  let text = DICTS[current][key] ?? en[key];
  for (const [name, value] of Object.entries(vars ?? {})) text = text.replace(`{${name}}`, value);
  return text;
}
