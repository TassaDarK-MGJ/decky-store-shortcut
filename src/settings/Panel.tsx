import { DropdownItem, Field, PanelSection, PanelSectionRow, ToggleField } from "@decky/ui";
import type { FeatureStatus } from "../features/status";
import { LANGS, LANGUAGE_NAMES, t, type LanguageSetting } from "../i18n";
import type { ShortcutButton } from "./schema";
import { setSetting, useSettings } from "./store";

export interface PanelProps {
  menuStatus: FeatureStatus;
  buttonStatus: FeatureStatus;
  footerStatus: FeatureStatus;
}

const BUTTON_LABELS: Record<Exclude<ShortcutButton, "off">, string> = { l3: "L3", r3: "R3" };

interface StatusLineProps {
  status: FeatureStatus;
  enabled: boolean;
  prefix: "menu" | "button" | "footer";
  vars?: Record<string, string>;
}

// One status line per feature (design 9.3): active, turned off, or unavailable with
// the finder's reason.
function StatusLine({ status, enabled, prefix, vars }: StatusLineProps) {
  const value = status.state === "unavailable"
    ? t(`status_${prefix}_unavailable`, { reason: status.reason })
    : t(`status_${prefix}_${enabled ? "active" : "disabled"}`, vars);

  return (
    <Field focusable disabled label={t(`status_${prefix}_label`)}>
      {value}
    </Field>
  );
}

// Quick Access Menu panel (design 9.3).
export function Panel({ menuStatus, buttonStatus, footerStatus }: PanelProps) {
  const settings = useSettings();
  const buttonOn = settings.shortcut_button !== "off";

  const languages: { data: LanguageSetting; label: string }[] = [
    { data: "auto", label: t("panel_language_auto") },
    ...LANGS.map((lang) => ({ data: lang, label: LANGUAGE_NAMES[lang] })),
  ];
  const buttons: { data: ShortcutButton; label: string }[] = [
    { data: "off", label: t("panel_button_off") },
    { data: "l3", label: BUTTON_LABELS.l3 },
    { data: "r3", label: BUTTON_LABELS.r3 },
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
            label={t("panel_button")}
            description={t("panel_button_desc")}
            rgOptions={buttons}
            selectedOption={settings.shortcut_button}
            disabled={buttonStatus.state === "unavailable"}
            onChange={(o) => setSetting("shortcut_button", o.data as ShortcutButton)}
            layout="below"
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t("panel_footer")}
            description={t("panel_footer_desc")}
            checked={settings.show_footer_hint}
            disabled={!buttonOn || footerStatus.state === "unavailable"}
            onChange={(v) => setSetting("show_footer_hint", v)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t("panel_feedback")}
            description={t("panel_feedback_desc")}
            checked={settings.unavailable_feedback}
            disabled={!buttonOn}
            onChange={(v) => setSetting("unavailable_feedback", v)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem
            label={t("panel_language")}
            rgOptions={languages}
            selectedOption={settings.language}
            onChange={(o) => setSetting("language", o.data as LanguageSetting)}
            layout="below"
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
          <StatusLine status={menuStatus} enabled={settings.menu_item_enabled} prefix="menu" />
        </PanelSectionRow>
        <PanelSectionRow>
          <StatusLine
            status={buttonStatus}
            enabled={buttonOn}
            prefix="button"
            vars={{
              button: buttonOn ? BUTTON_LABELS[settings.shortcut_button as Exclude<ShortcutButton, "off">] : "",
            }}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <StatusLine status={footerStatus} enabled={buttonOn && settings.show_footer_hint} prefix="footer" />
        </PanelSectionRow>
      </PanelSection>
    </>
  );
}
