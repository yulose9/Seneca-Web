/**
 * Data Logger Service (Firestore Edition)
 *
 * Paths:
 *   users/{uid}/daily_logs/{YYYY-MM-DD}   — per-day snapshot (PH timezone)
 *   users/{uid}/global_data/{docName}      — data that persists across days
 *
 * Sync engine guarantees (cost + correctness):
 * - ONE shared onSnapshot per document, reference-counted and kept warm for a
 *   few minutes after the last consumer leaves. Tab switches never re-bill reads,
 *   and getGlobalData()/getLogForDate() are served from that listener instead of
 *   a separate getDoc (previously every mount paid for 2 reads per doc).
 * - Writes are coalesced per document and HELD until the document has been
 *   hydrated from the server. A fresh device can never overwrite cloud data with
 *   its empty defaults, regardless of how slow the network is (replaces the old
 *   3-second "mount protection" timers, which also silently dropped real edits
 *   made in the first 3 seconds).
 * - Writes are diffed against the last known server state; unchanged fields are
 *   never re-sent, so cloud→state→effect echo loops cost zero writes.
 * - Writes use `mergeFields`, so a field is REPLACED rather than deep-merged.
 *   Deleting a key from a map (e.g. clearing a habit day) now actually syncs;
 *   with `merge: true` removed keys lived forever in Firestore and came back.
 * - Unsynced local edits are tracked as "dirty" in localStorage so consumers can
 *   decide between adopting cloud data (clean) or merging local on top (dirty).
 * - Pending writes are flushed on pagehide / tab hide and before logout.
 */

import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { getPhDateKey } from "../utils/timeUtils";

const STORAGE_KEY = "seneca_daily_logs";
const DIRTY_KEY = "seneca_sync_dirty";

const LISTENER_LINGER_MS = 5 * 60 * 1000; // keep idle listeners warm for 5 min
const DAILY_WRITE_DELAY = 1500;
const GLOBAL_WRITE_DELAY = 600;
const POST_HYDRATION_DELAY = 2500; // > slowest consumer debounce (1.5s): consumers re-queue merged state first
const HYDRATION_TIMEOUT_MS = 8000;

/**
 * Get today's date as YYYY-MM-DD pinned to Philippine Standard Time (UTC+8).
 * This ensures the day resets at midnight Manila time on all devices.
 */
export const getTodayKey = () => getPhDateKey();

// ─── AUTH ─────────────────────────────────────────────────────────────────────

const waitForAuth = async () => {
  await auth.authStateReady();
  return auth.currentUser;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Key-order independent: Firestore returns map keys sorted, local state keeps
// insertion order — a plain JSON compare would see phantom changes.
const stableStringify = (value) =>
  JSON.stringify(value ?? null, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.keys(v).sort().reduce((acc, k) => ((acc[k] = v[k]), acc), {})
      : v,
  );
const isEqual = (a, b) => stableStringify(a) === stableStringify(b);

const readDirty = () => {
  try {
    return JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}");
  } catch {
    return {};
  }
};

const setDirty = (key, dirty) => {
  const all = readDirty();
  if (dirty) all[key] = Date.now();
  else delete all[key];
  try {
    localStorage.setItem(DIRTY_KEY, JSON.stringify(all));
  } catch {
    /* storage full — dirty tracking is best-effort */
  }
};

// ─── SHARED DOCUMENT ENGINE ───────────────────────────────────────────────────
//
// entry = {
//   key, segments, uid, ref,
//   subscribers: Set<fn(data, meta)>,
//   unsub, lingerTimer,
//   data, exists, meta,            // latest snapshot (includes our pending writes)
//   hydrated, waiters: [],         // resolved on first authoritative snapshot
//   pending: { fieldPath: value }, // coalesced, not yet sent
//   timer, inflight,
// }

const _docs = new Map();

const docKey = (segments) => segments.join("/");

const getEntry = (segments) => {
  const key = docKey(segments);
  let entry = _docs.get(key);
  if (!entry) {
    entry = {
      key,
      segments,
      uid: null,
      ref: null,
      subscribers: new Set(),
      unsub: null,
      lingerTimer: null,
      attaching: null,
      data: null,
      exists: false,
      meta: null,
      hydrated: false,
      waiters: [],
      pending: null,
      timer: null,
      inflight: 0,
    };
    _docs.set(key, entry);
  }
  return entry;
};

const notify = (entry, meta) => {
  entry.subscribers.forEach((cb) => {
    try {
      cb(entry.data, meta);
    } catch (error) {
      console.error(`[sync] subscriber error (${entry.key}):`, error);
    }
  });
};

const markHydrated = (entry) => {
  if (entry.hydrated) return;
  entry.hydrated = true;
  entry.waiters.splice(0).forEach((resolve) => resolve(entry));
  // Writes made before hydration were held. Give consumers a beat to merge the
  // cloud state (which replaces the held payload with a merged one) first.
  if (entry.pending) scheduleFlush(entry, POST_HYDRATION_DELAY);
};

const attach = (entry) => {
  if (entry.unsub || entry.attaching) return entry.attaching;
  entry.attaching = waitForAuth().then((user) => {
    entry.attaching = null;
    if (!user) return;
    // Nobody is interested any more (unsubscribed before auth resolved)
    if (entry.subscribers.size === 0 && entry.waiters.length === 0 && !entry.pending) return;

    entry.uid = user.uid;
    entry.ref = doc(db, "users", user.uid, ...entry.segments);
    entry.unsub = onSnapshot(
      entry.ref,
      // REQUIRED: when the server merely confirms what's already cached, the SDK
      // only emits a metadata change (fromCache true → false). Without this flag
      // that event never arrives, the doc never hydrates, and every write stays
      // held forever on any device that has visited before. Metadata events are
      // not billed as reads.
      { includeMetadataChanges: true },
      (snap) => {
        const { fromCache, hasPendingWrites } = snap.metadata;
        const exists = snap.exists();
        const data = exists ? snap.data() : null;
        const dataChanged =
          !entry.meta || exists !== entry.exists || !isEqual(data, entry.data);
        entry.exists = exists;
        entry.data = data;
        // Server answers are authoritative. Cached data only counts when offline
        // (otherwise a days-old cache could clobber newer server data).
        const authoritative =
          !fromCache || (exists && typeof navigator !== "undefined" && !navigator.onLine);
        const wasHydrated = entry.hydrated;
        entry.meta = { fromCache, hasPendingWrites, exists, authoritative };
        if (authoritative) markHydrated(entry);
        // Skip pure metadata churn (pending-write acks etc.) unless it's the
        // moment the doc became authoritative — consumers care about that.
        if (dataChanged || (entry.hydrated && !wasHydrated)) notify(entry, entry.meta);
      },
      (error) => {
        console.error(`🔥 Sync listener error (${entry.key}):`, error);
      },
    );
  });
  return entry.attaching;
};

const detach = (entry) => {
  clearTimeout(entry.lingerTimer);
  entry.lingerTimer = null;
  if (entry.unsub) entry.unsub();
  entry.unsub = null;
  // Keep last data around (harmless), but require re-hydration on reattach.
  entry.hydrated = false;
};

const scheduleLinger = (entry) => {
  clearTimeout(entry.lingerTimer);
  entry.lingerTimer = setTimeout(() => {
    if (entry.subscribers.size === 0 && !entry.pending && entry.inflight === 0) {
      detach(entry);
    }
  }, LISTENER_LINGER_MS);
};

const subscribeEntry = (segments, callback) => {
  const entry = getEntry(segments);
  entry.subscribers.add(callback);
  clearTimeout(entry.lingerTimer);
  attach(entry);
  // Late subscribers get the current value immediately (no extra read)
  if (entry.meta) {
    const meta = entry.meta;
    queueMicrotask(() => {
      if (entry.subscribers.has(callback)) callback(entry.data, meta);
    });
  }
  return () => {
    entry.subscribers.delete(callback);
    if (entry.subscribers.size === 0) scheduleLinger(entry);
  };
};

const whenHydrated = (segments, timeoutMs = HYDRATION_TIMEOUT_MS) => {
  const entry = getEntry(segments);
  if (entry.hydrated && entry.unsub) return Promise.resolve(entry);
  attach(entry);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const i = entry.waiters.indexOf(done);
      if (i !== -1) entry.waiters.splice(i, 1);
      if (entry.subscribers.size === 0) scheduleLinger(entry);
      resolve(entry); // not hydrated — callers must treat data as provisional
    }, timeoutMs);
    function done(e) {
      clearTimeout(timer);
      if (e.subscribers.size === 0) scheduleLinger(e);
      resolve(e);
    }
    entry.waiters.push(done);
  });
};

const getAtPath = (obj, path) =>
  path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);

/** Queue field writes. `fields` keys are Firestore field paths ("a" or "a.b"). */
const queueWrite = (segments, fields, delay) => {
  const entry = getEntry(segments);
  entry.pending = { ...(entry.pending || {}), ...fields };
  setDirty(entry.key, true);
  clearTimeout(entry.lingerTimer);
  attach(entry);
  if (entry.hydrated) scheduleFlush(entry, delay);
  // else: held until markHydrated() schedules it
};

const scheduleFlush = (entry, delay) => {
  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => flush(entry), delay);
};

const flush = async (entry) => {
  clearTimeout(entry.timer);
  entry.timer = null;
  if (!entry.pending || !entry.hydrated || !entry.ref) return;
  // Never write into a different user's tree
  if (auth.currentUser?.uid !== entry.uid) {
    entry.pending = null;
    return;
  }

  const pending = entry.pending;
  entry.pending = null;

  // Diff against last known server state — skip unchanged fields entirely
  const changed = {};
  Object.entries(pending).forEach(([path, value]) => {
    if (!isEqual(getAtPath(entry.data, path), value)) changed[path] = value;
  });
  const paths = Object.keys(changed);

  if (paths.length === 0) {
    if (entry.inflight === 0) setDirty(entry.key, false);
    // Consumers may have skipped a remote snapshot while this was pending
    notify(entry, { ...entry.meta, replay: true });
    return;
  }

  // Build a nested payload for the dotted paths + bookkeeping fields
  const payload = {};
  paths.forEach((path) => {
    const parts = path.split(".");
    let node = payload;
    parts.slice(0, -1).forEach((p) => {
      node[p] = node[p] || {};
      node = node[p];
    });
    node[parts[parts.length - 1]] = changed[path];
  });
  const extras = entry.segments[0] === "daily_logs"
    ? { timestamp_updated: new Date().toISOString(), date: entry.segments[1], user_id: entry.uid }
    : { lastUpdated: new Date().toISOString() };
  Object.assign(payload, extras);

  entry.inflight += 1;
  try {
    await setDoc(entry.ref, payload, { mergeFields: [...paths, ...Object.keys(extras)] });
  } catch (error) {
    console.error(`Firestore write failed (${entry.key}):`, error);
    // Re-queue (newer local values win) so the next change or flush retries
    entry.pending = { ...changed, ...(entry.pending || {}) };
  } finally {
    entry.inflight -= 1;
  }

  if (!entry.pending && entry.inflight === 0) {
    setDirty(entry.key, false);
    // Re-deliver the settled state: consumers that ignored remote snapshots
    // while they had local edits in flight now converge.
    notify(entry, { ...entry.meta, hasPendingWrites: false, replay: true });
    if (entry.subscribers.size === 0) scheduleLinger(entry);
  }
};

/** Flush every pending write now (pagehide, logout). */
export const flushPendingWrites = () =>
  Promise.all([..._docs.values()].filter((e) => e.pending).map((e) => flush(e)));

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => flushPendingWrites());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingWrites();
  });
}

// Tear everything down on logout so nothing leaks across accounts
onAuthStateChanged(auth, (user) => {
  if (user) return;
  _docs.forEach((entry) => {
    clearTimeout(entry.timer);
    detach(entry);
  });
  _docs.clear();

  // Wipe local caches so another user on the same device doesn't see the
  // previous user's data before Firestore syncs
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("seneca_global_data");
  localStorage.removeItem("journal_entries");
  localStorage.removeItem(DIRTY_KEY);
});

const logSegments = (dateKey) => ["daily_logs", dateKey];
const globalSegments = (docName) => ["global_data", docName];

// Create an empty log structure
export const createEmptyLog = (dateKey) => ({
  date: dateKey,
  user_id: auth.currentUser?.uid || "unknown",
  timestamp_created: new Date().toISOString(),
  timestamp_updated: new Date().toISOString(),
  protocol: {
    completion_rate: 0,
    phases: {},
    custom_tasks: [],
    task_order: {},
    reflections: "",
  },
  growth: {
    active_study_goal: null,
    study_history: {},
    study_streak: 0,
    personal_goals: {
      noPorn: {},
      exercise: {},
    },
    current_weight: null,
    goal_weight: 90,
    certificates: [],
    study_sessions: [],
    focus_time: 0,
    books_read: [],
    reflections: "",
  },
  wealth: {
    assets: [],
    liabilities: [],
    transactions: [],
    net_worth: 0,
    reflections: "",
  },
  journal: {
    entries: [],
    mood: null,
    highlights: [],
    challenges: [],
  },
  metadata: {
    app_version: "1.0.0",
    device: "web",
  },
});

// ─── DAILY LOG API ────────────────────────────────────────────────────────────

/**
 * Get log for a specific date. Served from the shared listener (one read, reused
 * by subscribeToTodayLog). Falls back to localStorage when offline / timed out.
 */
export const getLogForDate = async (dateKey = getTodayKey()) => {
  const user = await waitForAuth();
  if (!user) return getLocalLog(dateKey);

  const entry = await whenHydrated(logSegments(dateKey));
  if (entry.exists && entry.data) {
    return { ...createEmptyLog(dateKey), ...entry.data };
  }
  return entry.hydrated ? createEmptyLog(dateKey) : getLocalLog(dateKey);
};

/**
 * Update a section of today's log.
 * - localStorage immediately (instant UI + offline safety)
 * - Firestore: coalesced (1.5s), held until hydrated, only changed sub-fields sent.
 *   Each `section.key` is replaced as a unit, so e.g. a removed custom task
 *   disappears from the cloud copy too.
 */
export const updateTodayLog = (section, data) => {
  const dateKey = getTodayKey();
  const localLog = updateLocalLog(dateKey, section, data);

  const fields = {};
  Object.entries(data).forEach(([k, v]) => {
    fields[`${section}.${k}`] = v === undefined ? null : v;
  });
  queueWrite(logSegments(dateKey), fields, DAILY_WRITE_DELAY);

  return localLog;
};

/** True while this device has unsent changes for today's log. */
export const hasPendingTodayWrite = (dateKey = getTodayKey()) => {
  const entry = _docs.get(docKey(logSegments(dateKey)));
  return !!entry && (!!entry.pending || entry.inflight > 0);
};

/**
 * Subscribe to a date's log (real-time). dateKey defaults to today (PH) but can
 * be passed explicitly so day-rollover reconnects to the new document.
 * callback(log, { fromCache, hasPendingWrites, exists, authoritative, replay? })
 */
export const subscribeToTodayLog = (callback, dateKey = getTodayKey()) =>
  subscribeEntry(logSegments(dateKey), (data, meta) => {
    if (meta.exists && data) {
      const fullLog = { ...createEmptyLog(dateKey), ...data };
      saveToLocal(dateKey, fullLog);
      callback(fullLog, meta);
    } else {
      // Doc doesn't exist yet — it is created on the first write
      callback(createEmptyLog(dateKey), meta);
    }
  });

// ─── LOCAL STORAGE HELPERS (Backing Store) ────────────────────────────────────

const getLocalLog = (dateKey) => {
  try {
    const allData = localStorage.getItem(STORAGE_KEY);
    const logs = allData ? JSON.parse(allData) : {};
    return logs[dateKey] || createEmptyLog(dateKey);
  } catch {
    return createEmptyLog(dateKey);
  }
};

const updateLocalLog = (dateKey, section, data) => {
  const navLog = getLocalLog(dateKey);
  navLog[section] = {
    ...navLog[section],
    ...data,
  };
  navLog.timestamp_updated = new Date().toISOString();
  saveToLocal(dateKey, navLog);
  return navLog;
};

const saveToLocal = (dateKey, logData) => {
  try {
    const allData = localStorage.getItem(STORAGE_KEY);
    const logs = allData ? JSON.parse(allData) : {};
    logs[dateKey] = logData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error("Local save failed", e);
  }
};

// ─── LEGACY EXPORTS (Kept for compatibility) ──────────────────────────────────

export const getAllLogs = () => {
  const allData = localStorage.getItem(STORAGE_KEY);
  return allData ? JSON.parse(allData) : {};
};

export const migrateOldData = async () => {
  console.log("Archive data mode active.");
};

// ─── EXPORT HELPERS (For ExportDataButton) ───────────────────────────────────

export const getLastNDaysLogs = (days = 30) => {
  const logs = getAllLogs();
  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return Object.entries(logs)
    .filter(([dateKey]) => {
      const date = new Date(dateKey);
      return date >= cutoffDate;
    })
    .sort(([a], [b]) => new Date(b) - new Date(a))
    .map(([, log]) => log);
};

export const exportForLLM = (days = 30) => {
  const logs = getLastNDaysLogs(days);

  const narrative = {
    user_profile: {
      user_id: auth.currentUser?.uid || "local_user",
      period: `Last ${days} days`,
      total_days: logs.length,
    },
    summary: {
      protocol: calculateProtocolSummary(logs),
      growth: calculateGrowthSummary(logs),
      wealth: calculateWealthSummary(logs),
      journal: calculateJournalSummary(logs),
    },
    daily_logs: logs,
    insights: {
      best_day: findBestDay(logs),
      worst_day: findWorstDay(logs),
      streaks: calculateStreaks(logs),
    },
  };

  return narrative;
};

export const exportAsLLMPrompt = (days = 30) => {
  const data = exportForLLM(days);

  return `
# User Habit Data (Last ${days} Days)

## Summary
- Days Tracked: ${data.user_profile.total_days}
- Average Protocol Completion: ${data.summary.protocol?.average_completion || 0}%
- Current Streak: ${data.insights.streaks.current_streak} days
- Longest Streak: ${data.insights.streaks.longest_streak} days

## Daily Logs
${JSON.stringify(data.daily_logs, null, 2)}

## Analysis Questions
Based on this data, please analyze:
1. Which habits do I skip most often?
2. What patterns exist between my morning routine and overall day success?
3. Which days of the week am I most productive?
4. Are there any correlations between my mood and completion rate?
`;
};

// ─── PRIVATE HELPERS ─────────────────────────────────────────────────────────

const calculateProtocolSummary = (logs) => {
  const validLogs = logs.filter((log) => log.protocol);
  if (validLogs.length === 0) return null;

  const avgCompletion =
    validLogs.reduce(
      (sum, log) => sum + (log.protocol.completion_rate || 0),
      0,
    ) / validLogs.length;

  return {
    average_completion: Math.round(avgCompletion * 100) / 100,
    total_days_tracked: validLogs.length,
    phases_completed: validLogs.filter(
      (log) => log.protocol.completion_rate === 1,
    ).length,
  };
};

const calculateGrowthSummary = (logs) => {
  const validLogs = logs.filter((log) => log.growth);
  if (validLogs.length === 0) return null;

  const totalStudyTime = validLogs.reduce(
    (sum, log) => sum + (log.growth.focus_time || 0),
    0,
  );

  return {
    total_study_time_minutes: totalStudyTime,
    total_sessions: validLogs.reduce(
      (sum, log) => sum + (log.growth.study_sessions?.length || 0),
      0,
    ),
    books_read: validLogs.reduce(
      (sum, log) => sum + (log.growth.books_read?.length || 0),
      0,
    ),
  };
};

const calculateWealthSummary = (logs) => {
  const validLogs = logs.filter((log) => log.wealth);
  if (validLogs.length === 0) return null;

  const transactions = validLogs.flatMap(
    (log) => log.wealth.transactions || [],
  );

  return {
    total_transactions: transactions.length,
    total_spent: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
    latest_net_worth: validLogs[0]?.wealth?.net_worth || 0,
  };
};

const calculateJournalSummary = (logs) => {
  const validLogs = logs.filter((log) => log.journal);
  if (validLogs.length === 0) return null;

  return {
    total_entries: validLogs.reduce(
      (sum, log) => sum + (log.journal.entries?.length || 0),
      0,
    ),
    mood_distribution: getMoodDistribution(validLogs),
  };
};

const getMoodDistribution = (logs) => {
  const moods = {};
  logs.forEach((log) => {
    if (log.journal.mood) {
      moods[log.journal.mood] = (moods[log.journal.mood] || 0) + 1;
    }
  });
  return moods;
};

const findBestDay = (logs) => {
  if (logs.length === 0) return null;
  return logs.reduce((best, current) => {
    const currentRate = current.protocol?.completion_rate || 0;
    const bestRate = best.protocol?.completion_rate || 0;
    return currentRate > bestRate ? current : best;
  }, logs[0]);
};

const findWorstDay = (logs) => {
  if (logs.length === 0) return null;
  return logs.reduce((worst, current) => {
    const currentRate = current.protocol?.completion_rate || 0;
    const worstRate = worst.protocol?.completion_rate || 1;
    return currentRate < worstRate ? current : worst;
  }, logs[0]);
};

const calculateStreaks = (logs) => {
  let currentStreak = 0;
  let longestStreak = 0;

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  for (let i = 0; i < sortedLogs.length; i++) {
    const completion = sortedLogs[i].protocol?.completion_rate || 0;
    if (completion >= 0.8) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
  };
};

// =============================================================================
// 🌐 GLOBAL DATA SYNC (For data that persists across days, like Wealth)
// =============================================================================

/**
 * Read a global doc. Resolves from the shared listener once the server has
 * answered (so a following subscribeToGlobalData costs no extra read).
 * Falls back to the local copy if the server can't be reached in time.
 */
export const getGlobalData = async (docName) => {
  const user = await waitForAuth();
  if (!user) return null;
  const entry = await whenHydrated(globalSegments(docName));
  if (entry.hydrated) return entry.exists ? entry.data : null;
  return entry.data ?? loadGlobalDataLocal(docName);
};

/**
 * Write top-level fields of a global doc. Each field in `data` is replaced as a
 * unit (deletions inside maps/arrays propagate). Coalesced, diffed, and held
 * until the doc is hydrated — safe to call on every state change.
 */
export const updateGlobalData = (docName, data) => {
  const fields = {};
  Object.entries(data).forEach(([k, v]) => {
    fields[k] = v === undefined ? null : v;
  });
  queueWrite(globalSegments(docName), fields, GLOBAL_WRITE_DELAY);
  return Promise.resolve();
};

/** True if this device has local edits for `docName` the server hasn't confirmed. */
export const isGlobalDirty = (docName) => !!readDirty()[docKey(globalSegments(docName))];

/** True while this device has unsent / unacknowledged changes for `docName`. */
export const hasPendingGlobalWrite = (docName) => {
  const entry = _docs.get(docKey(globalSegments(docName)));
  return !!entry && (!!entry.pending || entry.inflight > 0);
};

/** True once the doc has been confirmed against the server this session. */
export const isGlobalHydrated = (docName) => {
  const entry = _docs.get(docKey(globalSegments(docName)));
  return !!entry && entry.hydrated;
};

/**
 * Subscribe to a global doc (one shared listener per doc, app-wide).
 * callback(data, meta) — only called when the doc exists (legacy contract).
 * meta: { fromCache, hasPendingWrites, exists, authoritative, replay? }
 */
export const subscribeToGlobalData = (docName, callback) =>
  subscribeEntry(globalSegments(docName), (data, meta) => {
    if (!meta.exists || !data) return;
    saveGlobalDataLocal(docName, data);
    callback(data, meta);
  });

// Helper: Local storage for global data
const GLOBAL_STORAGE_KEY = "seneca_global_data";

export const saveGlobalDataLocal = (docName, data) => {
  try {
    const allData = JSON.parse(
      localStorage.getItem(GLOBAL_STORAGE_KEY) || "{}",
    );
    allData[docName] = data;
    localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(allData));
  } catch (e) {
    console.error("Failed to save global data locally:", e);
  }
};

export const loadGlobalDataLocal = (docName) => {
  try {
    const allData = JSON.parse(
      localStorage.getItem(GLOBAL_STORAGE_KEY) || "{}",
    );
    return allData[docName] || null;
  } catch {
    return null;
  }
};
