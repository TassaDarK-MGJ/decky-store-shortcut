// Phase 1 settings (design 9.1). Mirrors SCHEMA in main.py: the backend is the
// authority, this copy only guards the frontend against a malformed reply.
import { LANGS, type LanguageSetting } from "../i18n";

export interface Settings {
  menu_item_enabled: boolean;
  language: LanguageSetting;
  debug_logging: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  menu_item_enabled: true,
  language: "auto",
  debug_logging: false,
};

const LANGUAGES: readonly LanguageSetting[] = ["auto", ...LANGS];

export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    menu_item_enabled: typeof r.menu_item_enabled === "boolean" ? r.menu_item_enabled : DEFAULT_SETTINGS.menu_item_enabled,
    language: LANGUAGES.includes(r.language as LanguageSetting) ? (r.language as LanguageSetting) : DEFAULT_SETTINGS.language,
    debug_logging: typeof r.debug_logging === "boolean" ? r.debug_logging : DEFAULT_SETTINGS.debug_logging,
  };
}
