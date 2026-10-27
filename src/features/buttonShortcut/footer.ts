import { beforePatch } from "@decky/ui";
import { fromElement } from "../../core/appid";
import { safe } from "../../core/guard";
import { fiberOf, lookupOverview } from "../../core/steam";
import { t } from "../../i18n";
import { getSettings, subscribeSettings } from "../../settings/store";
import type { FooterButtons } from "./finder";
import { withFooterHint } from "./logic";

// Footer hint (8.4 F4, S0.7). The footer store feeds every focus change through
// SetActionsFromMap with the focused node in m_nodeForCurrentDescriptions. Our entry
// goes in keyed by the footer's own L3/R3 ids: the regular actionDescriptionMap route
// turns L3/R3 into A (S0.0 c). The store removes keys missing from the next map, so
// the entry leaves with the focus.
export function patchFooter(storeClass: any, buttons: FooterButtons): () => void {
  let store: any = null;

  // Recompute the footer for the node it already shows, so a settings change or the
  // unload takes effect without waiting for the next focus change.
  function refresh(): void {
    const node = store?.m_nodeForCurrentDescriptions;
    if (node && typeof store.UpdateForFocusedNode === "function") store.UpdateForFocusedNode(node);
  }

  const patch = beforePatch(storeClass.prototype, "SetActionsFromMap", function (this: any, args: any[]) {
    safe(
      "button bar hint",
      () => {
        store = this;
        const { shortcut_button, show_footer_hint } = getSettings();
        if (shortcut_button === "off" || !show_footer_hint) return;
        if (!fromElement(this.m_nodeForCurrentDescriptions?.m_element, fiberOf, lookupOverview)) return;
        args[0] = withFooterHint(args[0], buttons[shortcut_button], t("footer_hint"));
      },
      undefined,
    );
  });
  const unsubscribe = subscribeSettings(() => safe("button bar refresh", refresh, undefined));

  return () => {
    unsubscribe();
    patch.unpatch();
    safe("button bar refresh", refresh, undefined);
    store = null;
  };
}
