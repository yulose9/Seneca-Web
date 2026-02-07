/**
 * Data Logger Service (Firestore Edition)
 *
 * Structures all app data as Daily Log Documents in Firestore.
 *
 * Path: users/{uid}/daily_logs/{date}
 */

import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const STORAGE_KEY = "seneca_daily_logs";

// Get today's date in YYYY-MM-DD format
export const getTodayKey = () => {
  const now = new Date();
  // Use local time for the "day" boundary logic
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// --- FIRESTORE HELPERS ---

const getLogRef = (dateKey) => {
  if (!auth.currentUser) return null;
  return doc(db, "users", auth.currentUser.uid, "daily_logs", dateKey);
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
    custom_tasks: [], // Store custom tasks here
    task_order: {}, // Store task order here
    reflections: "",
  },
  growth: {
    // Study goal tracking
    active_study_goal: null,
    study_history: {},
    study_streak: 0,

    // Personal goals
    personal_goals: {
      noPorn: {},
      exercise: {},
    },
    current_weight: null,
    goal_weight: 90,

    // Certificates
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

// --- MAIN API ---

/**
 * Get log for a specific date (Async from Firestore)
 */
export const getLogForDate = async (dateKey = getTodayKey()) => {
  // 1. Try Firestore
  const ref = getLogRef(dateKey);
  if (!ref) {
    // Fallback to local if not logged in (shouldnt happen in strict mode)
    return getLocalLog(dateKey);
  }

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { ...createEmptyLog(dateKey), ...snap.data() };
    } else {
      // Create new for today
      const newLog = createEmptyLog(dateKey);
      // Optionally save it immediately, or wait for first update
      return newLog;
    }
  } catch (error) {
    console.error("Error fetching log:", error);
    return getLocalLog(dateKey); // Fallback to cache
  }
};

/**
 * Update a section of today's log (Writes to Firestore)
 */
export const updateTodayLog = async (section, data) => {
  const dateKey = getTodayKey();
  const ref = getLogRef(dateKey); // Will return null if not logged in

  // 1. Update LocalStorage (for instant UI and offline safety)
  const localLog = updateLocalLog(dateKey, section, data);

  // 2. Update Firestore (Background Sync)
  if (ref) {
    try {
      // We use setDoc with merge: true to handle both "create" and "update" cases
      await setDoc(
        ref,
        {
          [section]: data,
          timestamp_updated: new Date().toISOString(),
          // Ensure date and id are set
          date: dateKey,
          user_id: auth.currentUser.uid,
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Firestore sync failed:", error);
      // We still have local storage, so user data isn't lost locally
    }
  }

  return localLog;
};

/**
 * Subscribe to today's log changes (Real-time listener)
 * Useful for syncing across devices
 */
export const subscribeToTodayLog = (callback) => {
  const dateKey = getTodayKey();
  const ref = getLogRef(dateKey);
  if (!ref) return () => {};

  const unsubscribe = onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        // Merge with structure to ensure robust data
        const fullLog = { ...createEmptyLog(dateKey), ...data };
        // Update local storage to match cloud
        saveToLocal(dateKey, fullLog);
        callback(fullLog);
      }
    },
    (error) => {
      console.error("🔥 Real-time sync error:", error);
      // Don't crash, just silent fail or notify
    },
  );
  return unsubscribe;
};

// --- LOCAL STORAGE HELPERS (Backing Store) ---

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

  // Merge section data
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

// --- LEGACY EXPORTS (Kept for compatibility) ---
export const getAllLogs = () => {
  const allData = localStorage.getItem(STORAGE_KEY);
  return allData ? JSON.parse(allData) : {};
};

export const migrateOldData = async () => {
  // This is now purely "Import Local to Cloud" if needed
  // For now, we assume cloud is primary.
  console.log("Archive data mode active.");
};

// --- EXPORT HELPERS (For ExportDataButton) ---

// Get last N days of logs
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

// Export data for LLM analysis
export const exportForLLM = (days = 30) => {
  const logs = getLastNDaysLogs(days);

  // Create a narrative structure that LLMs love
  const narrative = {
    user_profile: {
      user_id: auth.currentUser?.uid || "local_user", // Updated to use auth if available
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

// Export LLM prompt-ready format
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

// --- PRIVATE HELPERS FOR EXPORTS ---

// Helper: Calculate protocol summary
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

// Helper: Calculate growth summary
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

// Helper: Calculate wealth summary
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

// Helper: Calculate journal summary
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

// Helper: Find best day (highest completion)
const findBestDay = (logs) => {
  if (logs.length === 0) return null;
  return logs.reduce((best, current) => {
    const currentRate = current.protocol?.completion_rate || 0;
    const bestRate = best.protocol?.completion_rate || 0;
    return currentRate > bestRate ? current : best;
  }, logs[0]);
};

// Helper: Find worst day
const findWorstDay = (logs) => {
  if (logs.length === 0) return null;
  return logs.reduce((worst, current) => {
    const currentRate = current.protocol?.completion_rate || 0;
    const worstRate = worst.protocol?.completion_rate || 1;
    return currentRate < worstRate ? current : worst;
  }, logs[0]);
};

// Helper: Calculate streaks
const calculateStreaks = (logs) => {
  let currentStreak = 0;
  let longestStreak = 0;

  // Sort logs by date (most recent first)
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  for (let i = 0; i < sortedLogs.length; i++) {
    const completion = sortedLogs[i].protocol?.completion_rate || 0;
    if (completion >= 0.8) {
      // 80% threshold for a "good day"
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
 * Get reference to a global data document
 * Path: users/{uid}/global_data/{docName}
 */
const waitForAuth = () => {
  return new Promise((resolve) => {
    if (auth.currentUser) return resolve(auth.currentUser);
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

const getGlobalDataRef = async (docName) => {
  const user = await waitForAuth();
  if (!user) return null;
  return doc(db, "users", user.uid, "global_data", docName);
};

/**
 * Get global data document
 */
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

/**
 * Update global data document (merge)
 */
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
    console.log(`[GlobalData] ✓ Synced ${docName} to Firestore`);
  } catch (error) {
    console.error(`Failed to update global data (${docName}):`, error);
  }
};

/**
 * Subscribe to global data changes
 */
export const subscribeToGlobalData = (docName, callback) => {
  let unsubscribeFirestore = () => {};
  let isMounted = true;

  getGlobalDataRef(docName).then((ref) => {
    if (!isMounted || !ref) return;

    unsubscribeFirestore = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          // Cache locally for offline access
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
