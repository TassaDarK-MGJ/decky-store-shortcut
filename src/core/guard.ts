import { log } from "./log";

// Fail-open wrapper (design 10): anything Steam can call into (patched renders,
// onSelected) goes through here, so an exception is logged and never reaches Steam.
export function safe<T>(context: string, fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (e) {
    log.error(`${context} failed:`, e);
    return fallback;
  }
}
