import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { updateTodayLog } from "../services/dataLogger";
import { usePersonalGoalDefinitions, usePersonalGoalHistory } from "../data/syncedData";
import { goalStreak } from "../utils/streaks";

/**
 * Personal Goals Context
 *
 * Personal habit/goal tracking separate from the Protocol system
 * (No Porn, Exercise + weight, custom habits). Synced across devices via
 * users/{uid}/global_data/personalGoals.
 */

const PersonalGoalsContext = createContext(null);

const DEFAULT_GOAL_IDS = ["noPorn", "exercise"];
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

export function PersonalGoalsProvider({ children }) {
  const [storedGoals, setGoals] = usePersonalGoalDefinitions();
  // History: { goalId: { "YYYY-MM-DD": true (done) | false (failed) } }
  const [goalHistory, setGoalHistory] = usePersonalGoalHistory();

  // Built-in goals always exist, even if a stored copy predates them
  const goals = useMemo(() => ({ ...DEFAULT_GOALS, ...storedGoals }), [storedGoals]);

  // Daily-log summary for analytics (diffed by dataLogger — no-op if unchanged)
  useEffect(() => {
    updateTodayLog("growth", {
      current_weight: goals.exercise?.currentWeight || null,
      goal_weight: goals.exercise?.goalWeight || 90,
      noPorn_streak: goalStreak(goalHistory.noPorn),
      exercise_streak: goalStreak(goalHistory.exercise),
    });
  }, [goals, goalHistory]);

  // Cycle: undefined → true (done) → false (failed) → undefined
  const toggleGoalDate = useCallback((goalId, dateStr) => {
    setGoalHistory((prev) => {
      const goalData = prev[goalId] || {};
      const current = goalData[dateStr];
      if (current === false) {
        const { [dateStr]: _removed, ...rest } = goalData;
        return { ...prev, [goalId]: rest };
      }
      return { ...prev, [goalId]: { ...goalData, [dateStr]: current === undefined } };
    });
  }, [setGoalHistory]);

  const getGoalHistory = useCallback((goalId) => goalHistory[goalId] || {}, [goalHistory]);

  const updateWeight = useCallback((newWeight) => {
    setGoals((prev) => ({
      ...prev,
      exercise: { ...DEFAULT_GOALS.exercise, ...prev.exercise, currentWeight: newWeight },
    }));
  }, [setGoals]);

  const addGoal = useCallback((emoji, title, color = "#8B5CF6") => {
    const id = `goal-${Date.now()}`;
    setGoals((prev) => ({
      ...prev,
      [id]: { id, title, emoji, color, type: "habit", createdAt: new Date().toISOString() },
    }));
    return id;
  }, [setGoals]);

  // Built-in goals can't be deleted. Removing the key now also removes it in
  // the cloud (field-level replace), so deleted goals no longer come back.
  const deleteGoal = useCallback((goalId) => {
    if (DEFAULT_GOAL_IDS.includes(goalId)) return false;
    setGoals((prev) => {
      const { [goalId]: _removed, ...rest } = prev;
      return rest;
    });
    setGoalHistory((prev) => {
      const { [goalId]: _removed, ...rest } = prev;
      return rest;
    });
    return true;
  }, [setGoals, setGoalHistory]);

  // Built-in goals first, then custom goals by creation date
  const getGoalsArray = useCallback(() => Object.values(goals).sort((a, b) => {
    const order = (g) => { const i = DEFAULT_GOAL_IDS.indexOf(g.id); return i === -1 ? 2 : i; };
    if (order(a) !== order(b)) return order(a) - order(b);
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  }), [goals]);

  const getGoalStreak = useCallback((goalId) => goalStreak(goalHistory[goalId]), [goalHistory]);

  const value = useMemo(() => ({
    goals,
    goalHistory,
    toggleGoalDate,
    getGoalHistory,
    updateWeight,
    getGoalStreak,
    addGoal,
    deleteGoal,
    getGoalsArray,
  }), [goals, goalHistory, toggleGoalDate, getGoalHistory, updateWeight, getGoalStreak, addGoal, deleteGoal, getGoalsArray]);

  return (
    <PersonalGoalsContext.Provider value={value}>
      {children}
    </PersonalGoalsContext.Provider>
  );
}

export function usePersonalGoals() {
  const context = useContext(PersonalGoalsContext);
  if (!context) {
    throw new Error("usePersonalGoals must be used within a PersonalGoalsProvider");
  }
  return context;
}
