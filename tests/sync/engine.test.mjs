// Loads src/services/dataLogger.js with firebase mocked, and exercises the sync engine.
import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

// Browser-ish globals
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
  root,
  configFile: false,
  logLevel: "error",
  server: { middlewareMode: true },
  resolve: {
    alias: [
      { find: /^firebase\/firestore$/, replacement: path.join(here, "mock-firestore.js") },
      { find: /^firebase\/auth$/, replacement: path.join(here, "mock-auth.js") },
      { find: /^\.\/firebase$/, replacement: path.join(here, "mock-firebase.js") },
    ],
  },
});
const mock = await server.ssrLoadModule(path.join(here, "mock-firestore.js"));
const dl = await server.ssrLoadModule("/src/services/dataLogger.js");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  if (!cond) failed++;
};

// ── 1. One listener shared by many subscribers + getGlobalData
mock.server.set("users/u1/global_data/wealth", { assets: [{ id: 1 }], transactions: [] });
const seen = [];
const u1 = dl.subscribeToGlobalData("wealth", (d, m) => seen.push(["a", m]));
const u2 = dl.subscribeToGlobalData("wealth", (d, m) => seen.push(["b", m]));
const g = await dl.getGlobalData("wealth");
await sleep(20);
check("getGlobalData returns server data", g?.assets?.[0]?.id === 1);
check("single Firestore listener for 2 subscribers + getGlobalData", mock.stats.listens === 1, `listens=${mock.stats.listens}`);
check("both subscribers notified", seen.some((s) => s[0] === "a") && seen.some((s) => s[0] === "b"));

// ── 2. Unchanged write is skipped (echo loop costs nothing)
dl.updateGlobalData("wealth", { assets: [{ id: 1 }] });
await sleep(800);
check("identical payload not written", mock.stats.writes === 0, `writes=${mock.stats.writes}`);

// ── 3. Changed write uses mergeFields and only changed field
dl.updateGlobalData("wealth", { assets: [{ id: 1 }], transactions: [{ id: 9 }] });
dl.updateGlobalData("wealth", { transactions: [{ id: 9 }, { id: 10 }] }); // coalesced
await sleep(800);
const w = mock.lastWrite;
check("coalesced into one write", mock.stats.writes === 1, `writes=${mock.stats.writes}`);
check("mergeFields only contains changed field + lastUpdated",
  JSON.stringify(w?.opts?.mergeFields) === JSON.stringify(["transactions", "lastUpdated"]),
  JSON.stringify(w?.opts));
check("dirty cleared after ack", dl.isGlobalDirty("wealth") === false);

// ── 4. Field replacement: deleting a key inside a map sticks
mock.server.set("users/u1/global_data/personalGoals", { goalHistory: { noPorn: { "2026-09-01": true, "2026-09-02": true } } });
const u3 = dl.subscribeToGlobalData("personalGoals", () => {});
await dl.getGlobalData("personalGoals");
dl.updateGlobalData("personalGoals", { goalHistory: { noPorn: { "2026-09-01": true } } });
await sleep(800);
const pg = mock.server.get("users/u1/global_data/personalGoals");
check("removed map key is gone on server", pg.goalHistory.noPorn["2026-09-02"] === undefined, JSON.stringify(pg.goalHistory));

// ── 5. Writes held until hydration (slow network, new device)
mock.control.delayServer = true;
mock.server.set("users/u1/global_data/journal", { entries: [{ id: 1 }, { id: 2 }] });
const journalSeen = [];
const u4 = dl.subscribeToGlobalData("journal", (d) => journalSeen.push(d));
dl.updateGlobalData("journal", { entries: [] }); // empty default from a fresh device
await sleep(1200);
check("write held while server hasn't answered", mock.stats.writesTo("global_data/journal") === 0);
// Consumer merges cloud once it arrives and re-queues the merged state
mock.control.release();
await sleep(50);
check("subscriber got cloud entries", journalSeen.at(-1)?.entries?.length === 2);
dl.updateGlobalData("journal", { entries: [{ id: 1 }, { id: 2 }] });
await sleep(3000);
check("stale empty payload never reached server",
  mock.server.get("users/u1/global_data/journal").entries.length === 2,
  JSON.stringify(mock.server.get("users/u1/global_data/journal")));
mock.control.delayServer = false;

// ── 6. Daily log: nonexistent doc is hydrated (new day) and writes go through
const logSeen = [];
const { getPhDateKey } = await server.ssrLoadModule("/src/utils/timeUtils.js");
const key = getPhDateKey();
const u5 = dl.subscribeToTodayLog((log, meta) => logSeen.push(meta), key);
await sleep(30);
check("nonexistent today doc delivered as authoritative", logSeen.some((m) => m.authoritative && !m.exists));
dl.updateTodayLog("protocol", { phases: { a: { done: 1 } }, custom_tasks: {} });
dl.updateTodayLog("growth", { study_streak: 3 });
await sleep(1700);
const dw = mock.lastWrite;
check("daily write uses dotted mergeFields",
  ["protocol.phases", "protocol.custom_tasks", "growth.study_streak"].every((f) => dw?.opts?.mergeFields?.includes(f)),
  JSON.stringify(dw?.opts?.mergeFields));
check("pending flag clears", dl.hasPendingTodayWrite(key) === false);

// ── 7. Replay after ack
const replays = logSeen.filter((m) => m.replay).length;
check("subscribers get a replay after local write settles", replays >= 1, `replays=${replays}`);

// ── 8. Unsubscribe + resubscribe within linger reuses listener
const before = mock.stats.listens;
u1(); u2();
const u6 = dl.subscribeToGlobalData("wealth", () => {});
await sleep(20);
check("tab switch within linger re-uses listener (no new read)", mock.stats.listens === before, `listens ${before}→${mock.stats.listens}`);

// ── 9. REGRESSION: returning device (doc already cached) must still write
mock.cached.add("users/u1/global_data/protocol");
mock.server.set("users/u1/global_data/protocol", { taskHistory: { a: { "2026-09-24": false } } });
const u7 = dl.subscribeToGlobalData("protocol", () => {});
await sleep(60);

dl.updateGlobalData("protocol", { taskHistory: { a: { "2026-09-24": true } } });
await sleep(800);
check("write from a returning device reaches the server",
  mock.server.get("users/u1/global_data/protocol").taskHistory.a["2026-09-24"] === true,
  JSON.stringify(mock.server.get("users/u1/global_data/protocol")));

// ── 10. Per-task history paths: two devices, different tasks, no clobbering
mock.server.set("users/u1/global_data/protocol", { taskHistory: { "arena-1": { "2026-09-24": true } } });
mock.emit("users/u1/global_data/protocol");
await sleep(20);
// This device (stale: never saw arena-1) ticks a different task
dl.updateGlobalData("protocol", { "taskHistory.shutdown-2": { "2026-09-24": true } });
await sleep(800);
const th = mock.server.get("users/u1/global_data/protocol").taskHistory;
check("other device's tick survives a concurrent tick on another task",
  th["arena-1"]?.["2026-09-24"] === true && th["shutdown-2"]?.["2026-09-24"] === true, JSON.stringify(th));
check("hyphenated keys written as FieldPath", mock.lastWrite.opts.mergeFields.includes("taskHistory.shutdown-2"),
  JSON.stringify(mock.lastWrite.opts.mergeFields));

[u3, u4, u5, u6, u7].forEach((u) => u());
console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
await server.close();
process.exit(failed ? 1 : 0);
