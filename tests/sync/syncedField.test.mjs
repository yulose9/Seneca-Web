// Tests src/services/syncedField.js through its interface, firebase mocked.
import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.window = { addEventListener() {} };
globalThis.document = { addEventListener() {}, visibilityState: "visible" };
Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });

const server = await createServer({
  root, configFile: false, logLevel: "error", server: { middlewareMode: true },
  resolve: { alias: [
    { find: /^firebase\/firestore$/, replacement: path.join(here, "mock-firestore.js") },
    { find: /^firebase\/auth$/, replacement: path.join(here, "mock-auth.js") },
    { find: /^\.\/firebase$/, replacement: path.join(here, "mock-firebase.js") },
  ] },
});
const mock = await server.ssrLoadModule(path.join(here, "mock-firestore.js"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  if (!cond) failed++;
};

// Leftover unsynced edits from a "previous session" for doc "goals"
store.set("seneca_sync_dirty", JSON.stringify({ "global_data/goals": 1 }));
store.set("ls_history", JSON.stringify({ "2026-09-20": true, "2026-09-21": true }));
mock.server.set("users/u1/global_data/goals", { history: { "2026-09-19": true, "2026-09-20": false }, list: ["a"] });

const { getSyncedField } = await server.ssrLoadModule("/src/services/syncedField.js");

// ── Wealth-like doc: two fields
mock.server.set("users/u1/global_data/wealth", { assets: [{ id: 1 }], transactions: [{ id: 7 }] });
const assets = getSyncedField("wealth", "assets", { initial: [] });
const tx = getSyncedField("wealth", "transactions", { initial: [], storageKey: "ls_tx" });
let emits = 0;
const ua = assets.subscribe(() => emits++);
const ut = tx.subscribe(() => {});
await sleep(40);
check("cloud value applied on load", assets.get()[0]?.id === 1 && tx.get()[0]?.id === 7);
check("cloud value mirrored to localStorage", JSON.parse(store.get("ls_tx"))[0].id === 7);
check("same (doc, field) returns the same instance", getSyncedField("wealth", "assets") === assets);
check("applying cloud data wrote nothing", mock.stats.writes === 0, `writes=${mock.stats.writes}`);

// Local change → only that field is written
assets.set((prev) => [...prev, { id: 2 }]);
check("local set is visible immediately", assets.get().length === 2 && emits >= 2);
await sleep(800);
check("only the changed field is written",
  JSON.stringify(mock.lastWrite?.opts?.mergeFields) === JSON.stringify(["assets", "lastUpdated"]),
  JSON.stringify(mock.lastWrite?.opts));
check("sibling field untouched on server", mock.server.get("users/u1/global_data/wealth").transactions[0].id === 7);

// Remote deletion (another device) replaces local — deletions stick, no write back
const writesBefore = mock.stats.writes;
mock.server.set("users/u1/global_data/wealth", { ...mock.server.get("users/u1/global_data/wealth"), transactions: [] });
mock.emit("users/u1/global_data/wealth");
await sleep(800);
check("remote deletion applied locally", tx.get().length === 0);
check("remote apply triggered no write-back", mock.stats.writes === writesBefore, `writes ${writesBefore}→${mock.stats.writes}`);

// ── Leftover dirty edits: merged with cloud and re-sent, for EVERY field
const merge = (local, cloud) => ({ ...cloud, ...local });
const history = getSyncedField("goals", "history", { initial: {}, storageKey: "ls_history", mergeDirty: merge });
const list = getSyncedField("goals", "list", { initial: ["local-only"] });
const uh = history.subscribe(() => {});
const ul = list.subscribe(() => {});
await sleep(3500); // post-hydration hold + write delay
const g = mock.server.get("users/u1/global_data/goals");
check("dirty field merged (local wins on conflict)",
  g.history["2026-09-19"] === true && g.history["2026-09-20"] === true && g.history["2026-09-21"] === true,
  JSON.stringify(g.history));
check("sibling dirty field also re-sent (default: local wins)", JSON.stringify(g.list) === JSON.stringify(["local-only"]), JSON.stringify(g.list));

[ua, ut, uh, ul].forEach((u) => u());
console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
await server.close();
process.exit(failed ? 1 : 0);
