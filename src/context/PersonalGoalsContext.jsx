import React, { createContext, useContext, useEffect, useState } from "react";
import { updateTodayLog } from "../services/dataLogger";

/**
 * Personal Goals Context
 *
 * Manages personal habit/goal tracking separate from the Protocol system
 * Examples: No Porn, Exercise, Weight tracking
 *
 * Now with localStorage persistence and dataLogger sync!
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

// Helper to format date as YYYY-MM-DD using LOCAL timezone
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

  // Sync to dataLogger whenever data changes
  useEffect(() => {
    updateTodayLog("growth", {
      personal_goals: {
        noPorn: goalHistory.noPorn || {},
        exercise: goalHistory.exercise || {},
      },
      current_weight: goals.exercise?.currentWeight || null,
      goal_weight: goals.exercise?.goalWeight || 90,
      // Calculate streaks for each goal
      noPorn_streak: getGoalStreakInternal("noPorn", goalHistory),
      exercise_streak: getGoalStreakInternal("exercise", goalHistory),
    });
  }, [goals, goalHistory]);

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
