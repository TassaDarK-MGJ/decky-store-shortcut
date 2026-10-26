import { DropdownItem, PanelSection, PanelSectionRow, ToggleField } from "@decky/ui";
import type { FeatureStatus } from "../features/contextMenu";
import { LANGS, LANGUAGE_NAMES, t, type LanguageSetting } from "../i18n";
import { setSetting, useSettings } from "./store";

// Quick Access Menu panel (design 9.3), Phase 1 subset: Feature A only.
export function Panel({ menuStatus }: { menuStatus: FeatureStatus }) {
  const settings = useSettings();

  const status =
    menuStatus.state === "unavailable"
      ? t("status_menu_unavailable", { reason: menuStatus.reason })
      : settings.menu_item_enabled
        ? t("status_menu_active")
        : t("status_menu_disabled");

  const languages: { data: LanguageSetting; label: string }[] = [
    { data: "auto", label: t("panel_language_auto") },
    ...LANGS.map((lang) => ({ data: lang, label: LANGUAGE_NAMES[lang] })),
  ];

  return (
    <>
      <PanelSection>
        <PanelSectionRow>
          <ToggleField
            label={t("panel_menu_item")}
            description={t("panel_menu_item_desc")}
            checked={settings.menu_item_enabled}
            disabled={menuStatus.state === "unavailable"}
            onChange={(v) => setSetting("menu_item_enabled", v)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem
            label={t("panel_language")}
            rgOptions={languages}
            selectedOption={settings.language}
            onChange={(o) => setSetting("language", o.data as LanguageSetting)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t("panel_debug")}
            description={t("panel_debug_desc")}
            checked={settings.debug_logging}
            onChange={(v) => setSetting("debug_logging", v)}
          />
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title={t("status_title")}>
        <PanelSectionRow>
          <div>{status}</div>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
}
