import { findModuleExport, getFocusNavController } from "@decky/ui";
import type { ShortcutButton } from "../../settings/schema";
import { FOOTER_BUTTON_NAMES, FOOTER_STORE_METHODS } from "./constants";

export type FooterButtons = Record<Exclude<ShortcutButton, "off">, number>;
export type FooterFind = { ok: true; storeClass: any; buttons: FooterButtons } | { ok: false; reason: string };
export type NavFind = { ok: true; controller: any } | { ok: false; reason: string };

// The controller whose unhandled-button callbacks receive L3/R3 (8.2 H1, S0.6).
export function findNavController(): NavFind {
  const controller = getFocusNavController?.();
  if (typeof controller?.RegisterForUnhandledButtonDownEvents !== "function") return { ok: false, reason: "button events not found" };
  return { ok: true, controller };
}

function isFooterButtonEnum(e: any): boolean {
  if (!e || typeof e !== "object") return false;
  // A TypeScript enum maps both ways, which rules out look-alike plain objects.
  return Object.values(FOOTER_BUTTON_NAMES).every((name) => typeof e[name] === "number" && e[e[name]] === name);
}

// The footer action store class and its own button enum (8.4 F4, S0.0 c–d).
export function findFooter(): FooterFind {
  const storeClass = findModuleExport((e: any) => FOOTER_STORE_METHODS.every((m) => typeof e?.prototype?.[m] === "function"));
  if (!storeClass) return { ok: false, reason: "button bar not found" };
  const buttonEnum: any = findModuleExport(isFooterButtonEnum);
  if (!buttonEnum) return { ok: false, reason: "button glyphs not found" };
  return { ok: true, storeClass, buttons: { l3: buttonEnum[FOOTER_BUTTON_NAMES.l3], r3: buttonEnum[FOOTER_BUTTON_NAMES.r3] } };
}
