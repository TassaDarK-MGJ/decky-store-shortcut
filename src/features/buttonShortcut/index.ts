import { safe } from "../../core/guard";
import { log } from "../../core/log";
import type { FeatureStatus } from "../status";
import { registerButton } from "./button";
import { findFooter, findNavController } from "./finder";
import { patchFooter } from "./footer";

export interface ButtonShortcut {
  button: FeatureStatus;
  footer: FeatureStatus;
  stop: () => void;
}

// Feature B (design 8). The button and its footer hint start and fail separately:
// a broken footer never takes the button down (design 0, rule 4).
export function startButtonShortcut(): ButtonShortcut {
  const stops: (() => void)[] = [];

  function start(name: string, attempt: () => (() => void) | string): FeatureStatus {
    const result = safe(name, attempt, "start error");
    if (typeof result === "string") {
      log.warn(`${name} unavailable: ${result}`);
      return { state: "unavailable", reason: result };
    }
    stops.push(result);
    log.info(`${name} active`);
    return { state: "active" };
  }

  const button = start("shortcut button", () => {
    const nav = findNavController();
    return nav.ok ? registerButton(nav.controller) : nav.reason;
  });
  const footer = start("button bar hint", () => {
    const found = findFooter();
    return found.ok ? patchFooter(found.storeClass, found.buttons) : found.reason;
  });

  return {
    button,
    footer,
    stop: () => {
      for (const stop of stops.splice(0)) safe("button shortcut stop", stop, undefined);
    },
  };
}
