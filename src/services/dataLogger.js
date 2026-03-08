/**
 * Data Logger Service (Firestore Edition)
 *
 * Structures all app data as Daily Log Documents in Firestore.
 *
 * Path: users/{uid}/daily_logs/{date}
 *
 * Key improvements (Prompt 1 — Firebase Skill):
 * - Auth-aware: waits for auth before attaching listeners / refs
 * - In-memory cache: prevents duplicate Firestore reads in the same session
 * - Debounced writes: updateTodayLog batches writes at 1.5s to save budget
 * - Race-condition fix: subscribeToGlobalData uses isMounted guard
 * - Empty doc bootstrap: listener creates the doc if it doesn't exist yet
 */

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const STORAGE_KEY = "seneca_daily_logs";

// ─── In-memory cache (avoids re-reading same doc in one session) ─────────────
const _logCache = new Map(); // dateKey → logData
const _globalCache = new Map(); // collection → globalData

// Clear caches on logout to prevent stale state across sessions (Fix for Prompt 6)
onAuthStateChanged(auth, (user) => {
  if (!user) {
    _logCache.clear();
    _globalCache.clear();
    // Also clear pending writes to prevent writing to a logged out user's path
    _pendingWrites.clear();
    _pendingGlobalWrites.clear();
    
    // Wipe local storage caches so another user logging in on the same device 
    // doesn't see the previous user's data before Firestore syncs
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("seneca_global_data");
    localStorage.removeItem("journal_entries");
  }
});

// ─── Pending write queue per section (for debouncing writes) ─────────────────
const _pendingWrites = new Map(); // dateKey → { timer, sections }
const _pendingGlobalWrites = new Map(); // collection → { timer, updates }

// Get today's date in YYYY-MM-DD format
export const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ─── FIRESTORE HELPERS ────────────────────────────────────────────────────────

/**
 * Wait for auth to resolve (handles the race between app init and auth state).
 * Returns the current user or null.
 */
const waitForAuth = () => {
  return new Promise((resolve) => {
    // If auth is already resolved, don't wait
    if (auth.currentUser !== undefined) {
      // currentUser is null before SDK resolves — onAuthStateChanged fires once immediately
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

const getLogRef = (uid, dateKey) => {
  if (!uid) return null;
  return doc(db, "users", uid, "daily_logs", dateKey);
};

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

// ─── MAIN API ─────────────────────────────────────────────────────────────────

/**
 * Get log for a specific date.
 * Checks in-memory cache first, then Firestore (which may itself hit local IndexedDB cache).
 */
export const getLogForDate = async (dateKey = getTodayKey()) => {
  // 1. In-memory cache hit
  if (_logCache.has(dateKey)) {
    return _logCache.get(dateKey);
  }

  // 2. Wait for auth to be ready
  const user = await waitForAuth();
  const ref = getLogRef(user?.uid, dateKey);

  if (!ref) {
    return getLocalLog(dateKey);
  }

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const log = { ...createEmptyLog(dateKey), ...snap.data() };
      _logCache.set(dateKey, log);
      return log;
    } else {
      const newLog = createEmptyLog(dateKey);
      _logCache.set(dateKey, newLog);
      return newLog;
    }
  } catch (error) {
    console.error("Error fetching log:", error);
    return getLocalLog(dateKey);
  }
};

/**
 * Update a section of today's log.
 * - Writes to localStorage immediately (instant UI + offline safety)
 * - Debounces Firestore write at 1.5s (batches rapid changes, saves budget)
 */
export const updateTodayLog = (section, data) => {
  const dateKey = getTodayKey();

  // 1. Update localStorage instantly
  const localLog = updateLocalLog(dateKey, section, data);

  // 2. Update in-memory cache
  if (_logCache.has(dateKey)) {
    const cached = _logCache.get(dateKey);
    _logCache.set(dateKey, {
      ...cached,
      [section]: { ...cached[section], ...data },
      timestamp_updated: new Date().toISOString(),
    });
  }

  // 3. Debounced Firestore write (1.5s — batches rapid user interactions)
  const pending = _pendingWrites.get(dateKey) || { timer: null, sections: {} };
  clearTimeout(pending.timer);
  pending.sections[section] = { ...(pending.sections[section] || {}), ...data };

  pending.timer = setTimeout(async () => {
    const user = await waitForAuth();
    const ref = getLogRef(user?.uid, dateKey);
    if (!ref) return;

    const sectionsToWrite = _pendingWrites.get(dateKey)?.sections || {};
    _pendingWrites.delete(dateKey);

    try {
      await setDoc(
        ref,
        {
          ...sectionsToWrite,
          timestamp_updated: new Date().toISOString(),
          date: dateKey,
          user_id: user.uid,
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Firestore debounced write failed:", error);
    }
  }, 1500);

  _pendingWrites.set(dateKey, pending);
  return localLog;
};

/**
 * Subscribe to today's log changes (Real-time listener).
 * - Waits for auth before attaching.
 * - Bootstraps the doc if it doesn't exist yet (so future listeners fire).
 * - Updates in-memory cache and localStorage on every cloud update.
 */
export const subscribeToTodayLog = (callback) => {
  const dateKey = getTodayKey();
  let unsubscribeFirestore = () => {};
  let isMounted = true;

  waitForAuth().then((user) => {
    if (!isMounted) return;
    const ref = getLogRef(user?.uid, dateKey);
    if (!ref) return;

    unsubscribeFirestore = onSnapshot(
      ref,
      (snap) => {
        if (!isMounted) return;
        if (snap.exists()) {
          const data = snap.data();
          const fullLog = { ...createEmptyLog(dateKey), ...data };
          // Update both caches
          _logCache.set(dateKey, fullLog);
          saveToLocal(dateKey, fullLog);
          callback(fullLog);
        } else {
          // Doc doesn't exist yet — bootstrap it so future writes use setDoc with merge
          // Don't write to Firestore here (avoid unnecessary writes), just return empty log
          const emptyLog = createEmptyLog(dateKey);
          _logCache.set(dateKey, emptyLog);
          callback(emptyLog);
        }
      },
      (error) => {
        console.error("🔥 Real-time sync error:", error);
      },
    );
  });

  return () => {
    isMounted = false;
    unsubscribeFirestore();
  };
};

// ─── LOCAL STORAGE HELPERS (Backing Store) ────────────────────────────────────

const getLocalLog = (dateKey) => {
  try {
    const allData = localStorage.getItem(STORAGE_KEY);
    const logs = allData ? JSON.parse(allData) : {};
    return logs[dateKey] || createEmptyLog(dateKey);
  } catch (e) {
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
    .map(([_, log]) => log);
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

const getGlobalDataRef = async (docName) => {
  const user = await waitForAuth();
  if (!user) return null;
  return doc(db, "users", user.uid, "global_data", docName);
};

export const getGlobalData = async (docName) => {
  const ref = await getGlobalDataRef(docName);
  if (!ref) return null;

  try {
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error(`Failed to get global data (${docName}):`, error);
    return null;
  }
};

export const updateGlobalData = async (docName, data) => {
  const ref = await getGlobalDataRef(docName);
  if (!ref) return;

  try {
    await setDoc(
      ref,
      {
        ...data,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error(`Failed to update global data (${docName}):`, error);
  }
};

/**
 * Subscribe to global data changes.
 * - Uses isMounted guard to prevent state updates after component unmount.
 * - Waits for auth before attaching the listener (fixes auth race condition).
 */
export const subscribeToGlobalData = (docName, callback) => {
  let unsubscribeFirestore = () => {};
  let isMounted = true;

  getGlobalDataRef(docName).then((ref) => {
    if (!isMounted || !ref) return;

    unsubscribeFirestore = onSnapshot(
      ref,
      (snap) => {
        if (!isMounted) return;
        if (snap.exists()) {
          const data = snap.data();
          saveGlobalDataLocal(docName, data);
          callback(data);
        }
      },
      (error) => {
        console.error(`🔥 Global data sync error (${docName}):`, error);
      },
    );
  });

  return () => {
    isMounted = false;
    unsubscribeFirestore();
  };
};

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
  } catch (e) {
    return null;
  }
};
