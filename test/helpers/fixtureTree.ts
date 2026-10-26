// Rebuilds element-like trees from the S0.3 probe dumps in test/fixtures/.
// The dumps record each child's type, key, prop names and whether its onSelected
// mentions launchSource / AppProperties; the stubs below reproduce exactly that.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface DumpItem {
  empty?: string;
  primitive?: string;
  type?: string;
  key?: string | null;
  props?: string[];
  launchSource?: boolean;
  appProperties?: boolean;
  children?: DumpItem[];
}

export interface MenuDump {
  overview: { appid: number; app_type: number; modOrShortcut: boolean };
  getTargetApps: number[];
  strategy1_appAppid: number | null;
  ret: { childrenLen: number; anchorIdx: number };
  items: DumpItem[];
}

export function loadDump(name: string): MenuDump {
  return JSON.parse(readFileSync(join(__dirname, "..", "fixtures", `s03-menu-${name}.json`), "utf8"));
}

function emptyValue(e: string): unknown {
  return e === "undefined" ? undefined : e === "null" ? null : e === "false" ? false : e === "true";
}

// Stub handlers whose source text carries the same markers as Steam's.
// Built with new Function so no transpiler can drop the marker text.
function handler(item: DumpItem): () => unknown {
  if (item.appProperties) return new Function("return this.props.navigator.AppProperties(1)") as () => unknown;
  if (item.launchSource) return new Function("return this.props.launchSource") as () => unknown;
  return () => undefined;
}

export function buildItem(item: DumpItem, appid: number): unknown {
  if (item.empty !== undefined) return emptyValue(item.empty);
  if (item.primitive !== undefined) return "text";
  const props: Record<string, unknown> = {};
  for (const name of item.props ?? []) {
    props[name] = name === "onSelected" ? handler(item) : name === "app" ? { appid } : name === "appId" ? appid : "x";
  }
  if (item.children) props.children = item.children.map((c) => buildItem(c, appid));
  return { type: item.type, key: item.key ?? null, props };
}

export function buildItems(dump: MenuDump): unknown[] {
  return dump.items.map((i) => buildItem(i, dump.overview.appid));
}
