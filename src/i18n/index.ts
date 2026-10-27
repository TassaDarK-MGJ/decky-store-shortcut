// i18n (design 9.5): in-code dictionaries for the main European languages, language
// from the setting or, on "auto", from Steam's own language.
import { de } from "./de";
import { en, type StringKey, type Strings } from "./en";

export type { StringKey };
import { es } from "./es";
import { fr } from "./fr";
import { it } from "./it";

export const LANGS = ["en", "fr", "es", "it", "de"] as const;
export type Lang = (typeof LANGS)[number];
export type LanguageSetting = "auto" | Lang;

const DICTS: Record<Lang, Strings> = { en, fr, es, it, de };

// Names shown in the language dropdown, each in its own language.
export const LANGUAGE_NAMES: Record<Lang, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  de: "Deutsch",
};

// Values of SteamClient.Settings.GetCurrentLanguage(); anything else falls back to English.
const STEAM_LANGUAGES: Record<string, Lang> = {
  english: "en",
  french: "fr",
  spanish: "es",
  latam: "es",
  italian: "it",
  german: "de",
};

function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

// steamLanguage: SteamClient.Settings.GetCurrentLanguage() ("spanish", "german"…).
// browserLanguage: navigator.language as a last resort.
export function resolveLanguage(setting: LanguageSetting, steamLanguage?: string | null, browserLanguage?: string | null): Lang {
  if (setting !== "auto") return setting;
  if (steamLanguage) return STEAM_LANGUAGES[steamLanguage] ?? "en";
  const prefix = browserLanguage?.toLowerCase().slice(0, 2) ?? "";
  return isLang(prefix) ? prefix : "en";
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
