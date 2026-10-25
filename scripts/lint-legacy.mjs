#!/usr/bin/env node
// Guard against legacy / deprecated Decky APIs (design doc, section 2).
// Scans src/, main.py and the build config. docs/, probes/ and this script are
// excluded because they mention these names on purpose.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

const FORBIDDEN = [
  "decky-frontend-lib",
  "ServerAPI",
  "serverApi",
  "decky_plugin",
  "staticClasses",
  "scrollClasses",
  "achievementClasses",
  "findModuleChild",
  "findAllModules",
];
// definePlugin must come from @decky/api, never from @decky/ui.
const DEFINE_PLUGIN_FROM_UI = /import\s*\{[^}]*\bdefinePlugin\b[^}]*\}\s*from\s*["']@decky\/ui["']/s;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|jsx?|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

const files = [
  ...walk(join(root, "src")),
  ...["main.py", "rollup.config.js", "package.json", "plugin.json", "tsconfig.json"]
    .map((f) => join(root, f))
    .filter(existsSync),
];

const problems = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const word of FORBIDDEN) {
      if (line.includes(word)) problems.push(`${relative(root, file)}:${i + 1}: forbidden "${word}"`);
    }
  });
  if (DEFINE_PLUGIN_FROM_UI.test(text)) problems.push(`${relative(root, file)}: definePlugin imported from @decky/ui`);
}

if (problems.length) {
  console.error("lint:legacy FAILED\n" + problems.join("\n"));
  process.exit(1);
}
console.log(`lint:legacy OK (${files.length} files)`);
