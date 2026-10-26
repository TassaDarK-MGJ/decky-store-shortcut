import { quickAccessMenuClasses } from "@decky/ui";
import { definePlugin } from "@decky/api";
import { FaStore } from "react-icons/fa";
import { log, setDebugLogging } from "./core/log";
import { startContextMenu } from "./features/contextMenu";
import { resolveLanguage, setLanguage } from "./i18n";
import { Panel } from "./settings/Panel";
import { getSettings, loadSettings, subscribeSettings } from "./settings/store";

// Phase 1: Feature A only (context menu entry). See the design doc, section 1.1.

let steamLanguage: string | null = null;

function applySettings(): void {
  const s = getSettings();
  setDebugLogging(s.debug_logging);
  setLanguage(resolveLanguage(s.language, steamLanguage, navigator.language));
}

async function detectSteamLanguage(): Promise<void> {
  try {
    steamLanguage = (await window.SteamClient?.Settings?.GetCurrentLanguage?.()) ?? null;
  } catch (e) {
    log.warn("could not read Steam's language:", e);
  }
  applySettings();
}

export default definePlugin(() => {
  const unsubscribe = subscribeSettings(applySettings);
  applySettings();
  // Patches go in synchronously and read the settings cache at use time (9.4).
  const contextMenu = startContextMenu();
  void loadSettings();
  void detectSteamLanguage();

  return {
    name: "Store Shortcut",
    titleView: <div className={quickAccessMenuClasses.Title}>Store Shortcut</div>,
    content: <Panel menuStatus={contextMenu.status} />,
    icon: <FaStore />,
    onDismount() {
      contextMenu.stop();
      unsubscribe();
      log.info("unloaded");
    },
  };
});
