/**
 * Data Logger Service
 *
 * Structures all app data as Daily Log Documents for LLM analysis.
 * Designed for easy migration to Firestore/NoSQL databases.
 *
 * Daily Log Format:
 * {
 *   date: "2025-12-30",
 *   user_id: "local_user",
 *   protocol: { phases, completion, reflections },
 *   growth: { study_sessions, focus_metrics },
 *   wealth: { transactions, net_worth },
 *   journal: { entries, mood }
 * }
 */

const STORAGE_KEY = "seneca_daily_logs";

/**
 * ☁️ MIGRATION TO FIRESTORE GUIDE ☁️
 * 
 * To move this to Google Cloud Firestore:
 * 1. Setup 'firebase.js' with your project config.
 * 2. Replace 'getAllLogs' and 'updateTodayLog' with Firestore calls:
 * 
 *    import { db } from './firebase';
 *    import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
 * 
 *    const getLogRef = (dateKey) => doc(db, "users", "USER_ID", "daily_logs", dateKey);
 * 
 *    // Example: updateTodayLog becomes:
 *    await setDoc(getLogRef(dateKey), { [section]: data }, { merge: true });
 * 
 * 3. IMPORTANT: Move Image handling in RichTextEditor to use Firebase Storage
 *    instead of Base64 strings to avoid hitting the 1MB document limit.
 */

// Get today's date in YYYY-MM-DD format
export const getTodayKey = () => {
  const now = new Date();
  return now.toISOString().split("T")[0];
};

// Get all daily logs from localStorage
export const getAllLogs = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Error reading daily logs:", error);
    return {};
  }
};

// Get log for a specific date
export const getLogForDate = (dateKey = getTodayKey()) => {
  const logs = getAllLogs();
  return logs[dateKey] || createEmptyLog(dateKey);
};

// Create an empty log structure
const createEmptyLog = (dateKey) => ({
  date: dateKey,
  user_id: "local_user",
  timestamp_created: new Date().toISOString(),
  timestamp_updated: new Date().toISOString(),
  protocol: {
    completion_rate: 0,
    phases: {},
    custom_tasks: [],
    reflections: "",
  },
  growth: {
    // Study goal tracking
    active_study_goal: null, // Current certificate being studied
    study_history: {}, // { "YYYY-MM-DD": true/false }
    study_streak: 0,

    // Personal goals (No Porn, Exercise, Weight)
    personal_goals: {
      noPorn: {}, // { "YYYY-MM-DD": true/false }
      exercise: {}, // { "YYYY-MM-DD": true/false }
    },
    current_weight: null,
    goal_weight: 90,

    // Certificates (snapshot of current status)
    certificates: [], // Array of { name, level, status, target }

    study_sessions: [],
    focus_time: 0,
    books_read: [],
    reflections: "",
  },
  wealth: {
    // Full financial snapshot
    assets: [], // Array of { id, name, platform, amount, category }
    liabilities: [], // Array of { id, name, platform, amount, isPriority }
    transactions: [], // Today's transactions
    net_worth: 0,
    total_assets: 0,
    total_liabilities: 0,
    spending_by_category: {},
    reflections: "",
  },
  journal: {
    entries: [], // Today's journal entries
    mood: null,
    highlights: [],
    challenges: [],
  },
  metadata: {
    app_version: "1.0.0",
    device: "web",
  },
});

// Update a section of today's log
export const updateTodayLog = (section, data) => {
  const dateKey = getTodayKey();
  const logs = getAllLogs();
  const todayLog = logs[dateKey] || createEmptyLog(dateKey);

  // Update the specific section
  todayLog[section] = {
    ...todayLog[section],
    ...data,
  };

  // Update timestamp
  todayLog.timestamp_updated = new Date().toISOString();

  // Save back to localStorage
  logs[dateKey] = todayLog;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));

  return todayLog;
};

// Get logs for a date range (for weekly/monthly analysis)
export const getLogsInRange = (startDate, endDate) => {
  const logs = getAllLogs();
  const start = new Date(startDate);
  const end = new Date(endDate);

  return Object.entries(logs)
    .filter(([dateKey]) => {
      const date = new Date(dateKey);
      return date >= start && date <= end;
    })
    .map(([_, log]) => log);
};

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
      user_id: "local_user",
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
      // This will be populated by patterns you discover
      best_day: findBestDay(logs),
      worst_day: findWorstDay(logs),
      streaks: calculateStreaks(logs),
    },
  };

  return narrative;
};

// Helper: Calculate protocol summary
const calculateProtocolSummary = (logs) => {
  const validLogs = logs.filter((log) => log.protocol);
  if (validLogs.length === 0) return null;

  const avgCompletion =
    validLogs.reduce(
      (sum, log) => sum + (log.protocol.completion_rate || 0),
      0
    ) / validLogs.length;

  return {
    average_completion: Math.round(avgCompletion * 100) / 100,
    total_days_tracked: validLogs.length,
    phases_completed: validLogs.filter(
      (log) => log.protocol.completion_rate === 1
    ).length,
  };
};

// Helper: Calculate growth summary
const calculateGrowthSummary = (logs) => {
  const validLogs = logs.filter((log) => log.growth);
  if (validLogs.length === 0) return null;

  const totalStudyTime = validLogs.reduce(
    (sum, log) => sum + (log.growth.focus_time || 0),
    0
  );

  return {
    total_study_time_minutes: totalStudyTime,
    total_sessions: validLogs.reduce(
      (sum, log) => sum + (log.growth.study_sessions?.length || 0),
      0
    ),
    books_read: validLogs.reduce(
      (sum, log) => sum + (log.growth.books_read?.length || 0),
      0
    ),
  };
};

// Helper: Calculate wealth summary
const calculateWealthSummary = (logs) => {
  const validLogs = logs.filter((log) => log.wealth);
  if (validLogs.length === 0) return null;

  const transactions = validLogs.flatMap(
    (log) => log.wealth.transactions || []
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
      0
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
    (a, b) => new Date(b.date) - new Date(a.date)
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

// Export LLM prompt-ready format
export const exportAsLLMPrompt = (days = 30) => {
  const data = exportForLLM(days);

  return `
# User Habit Data (Last ${days} Days)

## Summary
- Days Tracked: ${data.user_profile.total_days}
- Average Protocol Completion: ${data.summary.protocol?.average_completion || 0
    }%
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

// Migrate old localStorage data to new format (call once)
export const migrateOldData = () => {
  console.log("🔄 Migrating old data to Daily Log format...");

  // Check if migration already happened
  const migrationFlag = localStorage.getItem("migration_v1_completed");
  if (migrationFlag === "true") {
    console.log("✅ Migration already completed");
    return;
  }

  try {
    // Get today's log
    const todayLog = getLogForDate();

    // Migrate Protocol data
    const taskHistory = localStorage.getItem("protocol_task_history");
    const customTasks = localStorage.getItem("protocol_custom_tasks");

    if (taskHistory) {
      const history = JSON.parse(taskHistory);
      todayLog.protocol.phases = history;
    }

    if (customTasks) {
      todayLog.protocol.custom_tasks = JSON.parse(customTasks);
    }

    // Save migrated data
    const logs = getAllLogs();
    logs[todayLog.date] = todayLog;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));

    // Mark migration as complete
    localStorage.setItem("migration_v1_completed", "true");

    console.log("✅ Migration completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
};
