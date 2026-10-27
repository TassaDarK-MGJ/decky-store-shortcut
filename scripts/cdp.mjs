#!/usr/bin/env node
// Dev-only CDP helper (design doc, section 13.5). Not shipped with the plugin.
// Uses Node's built-in WebSocket (Node >= 22), so it has no dependencies.
//
//   node scripts/cdp.mjs targets
//   node scripts/cdp.mjs eval '<js>' | eval <file.js>      evaluate in SharedJSContext
//   node scripts/cdp.mjs record <out.jsonl> [--filter TEXT] record console output until Ctrl+C / SIGTERM
//   node scripts/cdp.mjs probe <name>                      run probes/<name>.js
//   node scripts/cdp.mjs watch-targets <out.jsonl>         log every change in the tab list (title, url)
//
// Option --tab "<title>" selects another target.
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const CDP = "http://localhost:8080";
// Same candidate list Decky's injector uses.
const SHARED_TITLES = ["SharedJSContext", "Steam Shared Context presented by Valve™", "Steam", "SP"];

const args = process.argv.slice(2);
function takeOpt(name) {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
}
const tabOpt = takeOpt("--tab");
const filterOpt = takeOpt("--filter");
const [cmd, ...rest] = args;

async function listTargets() {
  const res = await fetch(`${CDP}/json`);
  return res.json();
}

async function pickTarget() {
  const targets = await listTargets();
  const titles = tabOpt ? [tabOpt] : SHARED_TITLES;
  for (const t of titles) {
    const found = targets.find((x) => x.title === t && x.webSocketDebuggerUrl);
    if (found) return found;
  }
  throw new Error(`No CDP target among: ${titles.join(", ")}`);
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();
    const listeners = [];
    ws.onopen = () =>
      resolve({
        send(method, params = {}) {
          const id = nextId++;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise((res, rej) => pending.set(id, { res, rej }));
        },
        on(fn) {
          listeners.push(fn);
        },
        close() {
          ws.close();
        },
      });
    ws.onerror = (e) => reject(e.error ?? new Error("WebSocket error"));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      } else listeners.forEach((fn) => fn(msg));
    };
  });
}

async function evaluate(expression) {
  const target = await pickTarget();
  const c = await connect(target.webSocketDebuggerUrl);
  try {
    const r = await c.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  } finally {
    c.close();
  }
}

function sourceOf(arg) {
  return arg && existsSync(arg) ? readFileSync(arg, "utf8") : arg;
}

function print(v) {
  console.log(typeof v === "string" ? v : JSON.stringify(v, null, 2));
}

async function record(outFile) {
  const target = await pickTarget();
  const c = await connect(target.webSocketDebuggerUrl);
  c.on((msg) => {
    let level, text;
    if (msg.method === "Runtime.consoleAPICalled") {
      level = msg.params.type;
      text = msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(" ");
    } else if (msg.method === "Runtime.exceptionThrown") {
      // Uncaught errors (e.g. React's minified #185) never reach the console API.
      const d = msg.params.exceptionDetails;
      level = "exception";
      text = d.exception?.description ?? d.text;
    } else return;
    if (filterOpt && !text.includes(filterOpt)) return;
    const line = JSON.stringify({ t: new Date().toISOString(), level, text });
    appendFileSync(outFile, line + "\n");
  });
  await c.send("Runtime.enable");
  appendFileSync(outFile, JSON.stringify({ t: new Date().toISOString(), level: "recorder", text: `recording ${target.title}` }) + "\n");
  console.error(`Recording console of "${target.title}" to ${outFile} (Ctrl+C to stop)`);
  const stop = () => {
    appendFileSync(outFile, JSON.stringify({ t: new Date().toISOString(), level: "recorder", text: "stopped" }) + "\n");
    c.close();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  await new Promise(() => {});
}

// Polls the HTTP tab list instead of holding a WebSocket, so it keeps working across
// Steam restarts. Logs one line per target that appears, changes URL/title or goes away.
async function watchTargets(outFile) {
  const log = (entry) => appendFileSync(outFile, JSON.stringify({ t: new Date().toISOString(), ...entry }) + "\n");
  log({ event: "watching" });
  let known = new Map();
  let up = true;
  for (;;) {
    let list = null;
    try {
      list = await listTargets();
    } catch {
      if (up) log({ event: "cdp-down" });
      up = false;
    }
    if (list) {
      if (!up) log({ event: "cdp-up" });
      up = true;
      const now = new Map(list.map((t) => [t.id, { type: t.type, title: t.title, url: t.url }]));
      for (const [id, t] of now) {
        const old = known.get(id);
        if (!old) log({ event: "new", id: id.slice(0, 8), ...t });
        else if (old.url !== t.url || old.title !== t.title) log({ event: "changed", id: id.slice(0, 8), ...t });
      }
      for (const [id, t] of known) if (!now.has(id)) log({ event: "gone", id: id.slice(0, 8), title: t.title });
      known = now;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}

try {
  switch (cmd) {
    case "targets":
      for (const t of await listTargets()) console.log(`${t.type}\t${t.title}`);
      break;
    case "watch-targets":
      if (!rest[0]) throw new Error("watch-targets needs an output file");
      await watchTargets(rest[0]);
      break;
    case "eval":
      print(await evaluate(sourceOf(rest.join(" "))));
      break;
    case "probe": {
      const file = join(root, "probes", `${rest[0]}.js`);
      if (!existsSync(file)) throw new Error(`Unknown probe: ${file}`);
      print(await evaluate(readFileSync(file, "utf8")));
      break;
    }
    case "record":
      if (!rest[0]) throw new Error("record needs an output file");
      await record(rest[0]);
      break;
    default:
      console.error("Usage: cdp.mjs targets | eval <js|file> | probe <name> | record <out.jsonl> [--filter TEXT] [--tab TITLE]");
      process.exit(2);
  }
} catch (e) {
  console.error(`cdp: ${e.message}`);
  process.exit(1);
}
