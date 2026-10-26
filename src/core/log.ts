// Console logging with the plugin prefix (design 10). Output goes to the
// SharedJSContext console. Debug lines only appear when debug_logging is on.
const PREFIX = "[StoreShortcut]";

let debugEnabled = false;

export function setDebugLogging(enabled: boolean): void {
  debugEnabled = enabled;
}

export const log = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, ...args),
  error: (...args: unknown[]) => console.error(PREFIX, ...args),
  debug: (...args: unknown[]) => {
    if (debugEnabled) console.log(PREFIX, "[debug]", ...args);
  },
};
