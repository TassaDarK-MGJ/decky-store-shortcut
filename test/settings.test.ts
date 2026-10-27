import { describe, expect, it } from "vitest";
import { LANGS, resolveLanguage } from "../src/i18n";
import { de } from "../src/i18n/de";
import { en } from "../src/i18n/en";
import { es } from "../src/i18n/es";
import { fr } from "../src/i18n/fr";
import { it as itDict } from "../src/i18n/it";
import { DEFAULT_SETTINGS, sanitizeSettings } from "../src/settings/schema";

describe("sanitizeSettings", () => {
  it("keeps valid values", () => {
    const s = {
      menu_item_enabled: false,
      shortcut_button: "r3",
      show_footer_hint: false,
      unavailable_feedback: false,
      language: "es",
      debug_logging: true,
    };
    expect(sanitizeSettings(s)).toEqual(s);
  });
  it("defaults the shortcut to L3 with its hint and notice on (design 9.1, 17.1)", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ shortcut_button: "l3", show_footer_hint: true, unavailable_feedback: true });
  });
  it("rejects an unknown shortcut button", () => {
    expect(sanitizeSettings({ shortcut_button: "start" }).shortcut_button).toBe("l3");
  });
  it("accepts every supported language", () => {
    for (const language of ["auto", ...LANGS]) expect(sanitizeSettings({ language }).language).toBe(language);
  });
  it("falls back to defaults on bad input", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ menu_item_enabled: "yes", language: "pt", debug_logging: 1 })).toEqual(DEFAULT_SETTINGS);
  });
  it("drops unknown keys", () => {
    expect(sanitizeSettings({ footer_glyph: "l3" })).toEqual(DEFAULT_SETTINGS);
  });
});

describe("resolveLanguage (9.5)", () => {
  it("honours an explicit setting", () => {
    expect(resolveLanguage("en", "spanish")).toBe("en");
    expect(resolveLanguage("es", "english")).toBe("es");
    expect(resolveLanguage("de", "french")).toBe("de");
  });
  it("maps Steam's language on auto", () => {
    expect(resolveLanguage("auto", "spanish")).toBe("es");
    expect(resolveLanguage("auto", "latam")).toBe("es");
    expect(resolveLanguage("auto", "english")).toBe("en");
    expect(resolveLanguage("auto", "french")).toBe("fr");
    expect(resolveLanguage("auto", "italian")).toBe("it");
    expect(resolveLanguage("auto", "german")).toBe("de");
    expect(resolveLanguage("auto", "portuguese")).toBe("en");
  });
  it("uses the browser language only without Steam's", () => {
    expect(resolveLanguage("auto", null, "es-ES")).toBe("es");
    expect(resolveLanguage("auto", null, "fr-FR")).toBe("fr");
    expect(resolveLanguage("auto", null, "de")).toBe("de");
    expect(resolveLanguage("auto", null, "pt-BR")).toBe("en");
    expect(resolveLanguage("auto")).toBe("en");
  });
});

describe("dictionaries", () => {
  it("every language has every en key, non-empty", () => {
    for (const dict of [fr, es, itDict, de])
      for (const key of Object.keys(en) as (keyof typeof en)[]) expect(dict[key]).toBeTruthy();
  });
});
