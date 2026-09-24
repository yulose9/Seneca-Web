import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import {
  updateTodayLog,
  updateGlobalData,
  subscribeToGlobalData,
  hasPendingGlobalWrite,
  isGlobalDirty,
} from "../services/dataLogger";

/**
 * Personal Goals Context
 *
 * Manages personal habit/goal tracking separate from the Protocol system
 * Examples: No Porn, Exercise, Weight tracking
 *
 * Now with Firestore persistence and sync!
 */

const PersonalGoalsContext = createContext(null);

// LocalStorage keys
const STORAGE_KEYS = {
  GOALS: "personal_goals_config",
  HISTORY: "personal_goals_history",
};

// Default goals structure
const DEFAULT_GOALS = {
  noPorn: {
    id: "noPorn",
    title: "No Porn",
    emoji: "🚫",
    color: "#8B5CF6",
    type: "habit", // Simple daily check
  },
  exercise: {
    id: "exercise",
    title: "Exercise",
    emoji: "🏋️",
    color: "#007AFF",
    type: "weight", // Has weight tracking
    currentWeight: 120,
    goalWeight: 90,
  },
};

// Helper to format date as YYYY-MM-DD using Philippine Standard Time (UTC+8)
const formatLocalDate = (date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

// Load from localStorage
const loadGoals = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GOALS);
    return saved ? { ...DEFAULT_GOALS, ...JSON.parse(saved) } : DEFAULT_GOALS;
  } catch {
    return DEFAULT_GOALS;
  }
};

const loadHistory = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

export function PersonalGoalsProvider({ children }) {
  // Interaction timestamp to prevent "Cloud Echo" overwrites
  const lastLocalInteraction = useRef(0);

  // Bumped when unsynced edits from a previous session must be re-sent
  const [resyncNonce, setResyncNonce] = useState(0);

  // Goals definitions - persisted
  const [goals, setGoals] = useState(loadGoals);

  // History: { "goalId": { "YYYY-MM-DD": true/false } }
  // true = completed/success, false = failed, undefined = no data
  const [goalHistory, setGoalHistory] = useState(loadHistory);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(goalHistory));
  }, [goalHistory]);

  // Initial cloud state arrives through the real-time listener below (one shared
  // Firestore listener — no separate getDoc read).

  // 🌐 Sync PersonalGoals to GLOBAL storage (persists across days)
  useEffect(() => {
    // Only sync after user has actually interacted. dataLogger holds the write
    // until the doc is hydrated from the server, so a new device can't clobber it.
    if (lastLocalInteraction.current === 0) return;

    const syncTimer = setTimeout(() => {
      console.log("[PersonalGoals] Syncing to GLOBAL Firestore...");

      // 🌐 GLOBAL DATA: Save to global_data/personalGoals (persists across days!)
      updateGlobalData("personalGoals", {
        goals: goals,
        goalHistory: goalHistory,
      });

      // Daily log: Just summary for analytics
      updateTodayLog("growth", {
        current_weight: goals.exercise?.currentWeight || null,
        goal_weight: goals.exercise?.goalWeight || 90,
        noPorn_streak: getGoalStreakInternal("noPorn", goalHistory),
        exercise_streak: getGoalStreakInternal("exercise", goalHistory),
      });
    }, 800); // 800ms debounce

    return () => clearTimeout(syncTimer);
  }, [goals, goalHistory, resyncNonce]);

  // 🚀 REAL-TIME CLOUD SYNC for global PersonalGoals data (also the initial load)
  useEffect(() => {
    let handledDirty = false;
    const unsubscribe = subscribeToGlobalData("personalGoals", (cloudData, meta) => {
      if (!cloudData) return;

      // Local edits not yet on the server win; the settled state is re-delivered
      // (meta.replay) once they land, so nothing is dropped for good.
      if (
        hasPendingGlobalWrite("personalGoals") ||
        Date.now() - lastLocalInteraction.current < 1500
      ) return;

      // Unsynced edits from a previous session: keep local on top, then re-push
      const leftoverDirty = meta?.authoritative && !handledDirty && isGlobalDirty("personalGoals");
      if (meta?.authoritative) handledDirty = true;
      if (leftoverDirty) {
        if (cloudData.goals) setGoals((prev) => ({ ...cloudData.goals, ...prev }));
        setGoalHistory((prev) => {
          const merged = {};
          const keys = new Set([...Object.keys(cloudData.goalHistory || {}), ...Object.keys(prev)]);
          keys.forEach((k) => {
            merged[k] = { ...(cloudData.goalHistory?.[k] || {}), ...(prev[k] || {}) };
          });
          return merged;
        });
        lastLocalInteraction.current = Date.now();
        setResyncNonce((n) => n + 1);
        return;
      }

      console.log("[PersonalGoals] Received global data from cloud");

      // 1. Sync Goals
      if (cloudData.goals) {
        setGoals(prev => {
          if (JSON.stringify(prev) === JSON.stringify(cloudData.goals)) return prev;
          return { ...prev, ...cloudData.goals };
        });
      }

      // 2. Sync Goal History
      if (cloudData.goalHistory) {
        setGoalHistory(prev => {
          const merged = { ...prev, ...cloudData.goalHistory };
          if (JSON.stringify(merged) === JSON.stringify(prev)) return prev;
          return merged;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Internal streak calculation (doesn't use state)
  const getGoalStreakInternal = (goalId, history) => {
    const goalData = history[goalId] || {};
    const today = new Date();
    let streak = 0;
    let checkDate = new Date(today);

    const todayStr = formatLocalDate(checkDate);
    if (goalData[todayStr] !== true) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = formatLocalDate(checkDate);
      if (goalData[dateStr] === true) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  // Toggle a goal for a specific date
  const toggleGoalDate = (goalId, dateStr) => {
    lastLocalInteraction.current = Date.now();
    setGoalHistory((prev) => {
      const goalData = prev[goalId] || {};
      const currentVal = goalData[dateStr];

      // Cycle: undefined -> true -> false -> undefined
      let newVal;
      if (currentVal === undefined) {
        newVal = true; // Mark as done
      } else if (currentVal === true) {
        newVal = false; // Mark as failed
      } else {
        newVal = undefined; // Clear
      }

      // If newVal is undefined, remove the key
      if (newVal === undefined) {
        const { [dateStr]: _, ...rest } = goalData;
        return {
          ...prev,
          [goalId]: rest,
        };
      }

      return {
        ...prev,
        [goalId]: {
          ...goalData,
          [dateStr]: newVal,
        },
      };
    });
  };

  // Get history for a specific goal
  const getGoalHistory = (goalId) => {
    return goalHistory[goalId] || {};
  };

  // Update weight for exercise goal
  const updateWeight = (newWeight) => {
    lastLocalInteraction.current = Date.now();
    setGoals((prev) => ({
      ...prev,
      exercise: {
        ...prev.exercise,
        currentWeight: newWeight,
      },
    }));
  };

  // Add a new personal goal
  const addGoal = (emoji, title, color = "#8B5CF6") => {
    lastLocalInteraction.current = Date.now();
    const id = `goal-${Date.now()}`;
    const newGoal = {
      id,
      title,
      emoji,
      color,
      type: "habit",
      createdAt: new Date().toISOString(),
    };

    setGoals((prev) => ({
      ...prev,
      [id]: newGoal,
    }));

    return id;
  };

  // Delete a personal goal
  const deleteGoal = (goalId) => {
    lastLocalInteraction.current = Date.now();
    // Don't allow deleting default goals
    if (goalId === "noPorn" || goalId === "exercise") {
      return false;
    }

    setGoals((prev) => {
      const { [goalId]: _, ...rest } = prev;
      return rest;
    });

    // Also remove history for deleted goal
    setGoalHistory((prev) => {
      const { [goalId]: _, ...rest } = prev;
      return rest;
    });

    return true;
  };

  // Get all goals as an array (for rendering)
  const getGoalsArray = () => {
    return Object.values(goals).sort((a, b) => {
      // Keep default goals at top
      const defaultOrder = { noPorn: 0, exercise: 1 };
      const aOrder = defaultOrder[a.id] ?? 2;
      const bOrder = defaultOrder[b.id] ?? 2;
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Sort custom goals by creation date
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });
  };

  // Calculate streak for a goal
  const getGoalStreak = (goalId) => {
    const history = goalHistory[goalId] || {};
    const today = new Date();
    let streak = 0;
    let checkDate = new Date(today);

    // Check today first
    const todayStr = formatLocalDate(checkDate);
    if (history[todayStr] !== true) {
      // If today not done, start checking from yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = formatLocalDate(checkDate);
      if (history[dateStr] === true) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const value = {
    goals,
    goalHistory,
    toggleGoalDate,
    getGoalHistory,
    updateWeight,
    getGoalStreak,
    addGoal,
    deleteGoal,
    getGoalsArray,
  };

  return (
    <PersonalGoalsContext.Provider value={value}>
      {children}
    </PersonalGoalsContext.Provider>
  );
}

export function usePersonalGoals() {
  const context = useContext(PersonalGoalsContext);
  if (!context) {
    throw new Error(
      "usePersonalGoals must be used within a PersonalGoalsProvider"
    );
  }
  return context;
}
