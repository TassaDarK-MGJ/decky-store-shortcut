import { describe, expect, it } from "vitest";
import { resolveLanguage } from "../src/i18n";
import { en } from "../src/i18n/en";
import { es } from "../src/i18n/es";
import { DEFAULT_SETTINGS, sanitizeSettings } from "../src/settings/schema";

describe("sanitizeSettings", () => {
  it("keeps valid values", () => {
    const s = { menu_item_enabled: false, language: "es", debug_logging: true };
    expect(sanitizeSettings(s)).toEqual(s);
  });
  it("falls back to defaults on bad input", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ menu_item_enabled: "yes", language: "fr", debug_logging: 1 })).toEqual(DEFAULT_SETTINGS);
  });
  it("drops unknown keys", () => {
    expect(sanitizeSettings({ shortcut_button: "l3" })).toEqual(DEFAULT_SETTINGS);
  });
});

describe("resolveLanguage (9.5)", () => {
  it("honours an explicit setting", () => {
    expect(resolveLanguage("en", "spanish")).toBe("en");
    expect(resolveLanguage("es", "english")).toBe("es");
  });
  it("maps Steam's language on auto", () => {
    expect(resolveLanguage("auto", "spanish")).toBe("es");
    expect(resolveLanguage("auto", "latam")).toBe("es");
    expect(resolveLanguage("auto", "english")).toBe("en");
    expect(resolveLanguage("auto", "german")).toBe("en");
  });
  it("uses the browser language only without Steam's", () => {
    expect(resolveLanguage("auto", null, "es-ES")).toBe("es");
    expect(resolveLanguage("auto", null, "fr-FR")).toBe("en");
    expect(resolveLanguage("auto")).toBe("en");
  });
});

describe("dictionaries", () => {
  it("es has every en key, non-empty", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) expect(es[key]).toBeTruthy();
  });
});
