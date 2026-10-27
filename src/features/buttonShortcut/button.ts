import { toaster } from "@decky/api";
import { fromElement, findCapsuleAppId } from "../../core/appid";
import { safe } from "../../core/guard";
import { log } from "../../core/log";
import { fiberOf, lookupOverview } from "../../core/steam";
import { openStorePage } from "../../core/store";
import { t } from "../../i18n";
import { getSettings } from "../../settings/store";
import { DEBOUNCE_MS } from "./constants";
import { createDebounce, isShortcutPress, type ButtonDetail } from "./logic";

interface UnhandledButtonEvent {
  detail?: ButtonDetail;
  target?: unknown;
}

// Feature B button (8.2 H1, 8.3). Steam only hands us buttons nothing else handled,
// so native functions are never hijacked. The event's target is the focused element
// (S0.6); with the context menu open it is a menu item, which resolves to nothing.
export function registerButton(controller: any): () => void {
  const debounce = createDebounce(DEBOUNCE_MS);

  function onUnhandled(event: UnhandledButtonEvent): void {
    const settings = getSettings();
    if (!isShortcutPress(event?.detail, settings.shortcut_button)) return;
    const target = event.target;
    // Not a capsule at all: stay silent.
    if (findCapsuleAppId(fiberOf(target)) == null) return;
    if (!debounce()) return;
    const app = fromElement(target, fiberOf, lookupOverview);
    if (!app) {
      log.debug("shortcut on a capsule without a store page");
      if (settings.unavailable_feedback) toaster.toast({ title: "Store Shortcut", body: t("toast_no_store") });
      return;
    }
    openStorePage(app.appid);
  }

  const registration = controller.RegisterForUnhandledButtonDownEvents((event: UnhandledButtonEvent) =>
    safe("shortcut button", () => onUnhandled(event), undefined),
  );
  return () => {
    if (typeof registration === "function") registration();
    else registration?.Unregister?.();
  };
}
