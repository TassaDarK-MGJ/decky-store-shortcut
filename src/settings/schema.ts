// Settings (design 9.1). Mirrors SCHEMA in main.py: the backend is the authority,
// this copy only guards the frontend against a malformed reply.
import { LANGS, type LanguageSetting } from "../i18n";

export const SHORTCUT_BUTTONS = ["off", "l3", "r3"] as const;
export type ShortcutButton = (typeof SHORTCUT_BUTTONS)[number];

export interface Settings {
  menu_item_enabled: boolean;
  shortcut_button: ShortcutButton;
  show_footer_hint: boolean;
  unavailable_feedback: boolean;
  language: LanguageSetting;
  debug_logging: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  menu_item_enabled: true,
  shortcut_button: "l3",
  show_footer_hint: true,
  unavailable_feedback: true,
  language: "auto",
  debug_logging: false,
};

const LANGUAGES: readonly LanguageSetting[] = ["auto", ...LANGS];

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function oneOf<T extends string>(value: unknown, choices: readonly T[], fallback: T): T {
  return choices.includes(value as T) ? (value as T) : fallback;
}

export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    menu_item_enabled: bool(r.menu_item_enabled, d.menu_item_enabled),
    shortcut_button: oneOf(r.shortcut_button, SHORTCUT_BUTTONS, d.shortcut_button),
    show_footer_hint: bool(r.show_footer_hint, d.show_footer_hint),
    unavailable_feedback: bool(r.unavailable_feedback, d.unavailable_feedback),
    language: oneOf(r.language, LANGUAGES, d.language),
    debug_logging: bool(r.debug_logging, d.debug_logging),
  };
}
