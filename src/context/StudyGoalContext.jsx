import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { updateTodayLog } from "../services/dataLogger";
import { useActiveStudyGoal, useStudyHistory } from "../data/syncedData";
import { getPhDateKey, toDateKey } from "../utils/timeUtils";
import { studyStreak } from "../utils/streaks";

const StudyGoalContext = createContext(null);

export function StudyGoalProvider({ children }) {
  // Synced to users/{uid}/global_data/studyGoal (cross-device), cached locally
  const [activeStudyGoal, setActiveStudyGoal] = useActiveStudyGoal();
  const [studyHistory, setStudyHistory] = useStudyHistory();

  // Daily-log summary for analytics (diffed by dataLogger — no-op if unchanged)
  useEffect(() => {
    updateTodayLog("growth", {
      active_study_goal: activeStudyGoal,
      study_streak: studyStreak(studyHistory),
    });
  }, [activeStudyGoal, studyHistory]);

  const setStudyGoal = useCallback((certificate) => setActiveStudyGoal(certificate), [setActiveStudyGoal]);
  const clearStudyGoal = useCallback(() => setActiveStudyGoal(null), [setActiveStudyGoal]);

  // Cycle: undefined → true (studied) → false (missed) → undefined
  const toggleStudyDate = useCallback((dateStr) => {
    setStudyHistory((prev) => {
      const current = prev[dateStr];
      if (current === false) {
        const { [dateStr]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [dateStr]: current === undefined };
    });
  }, [setStudyHistory]);

  // "Did you study today?" — onStudied runs when the answer is yes
  const markStudiedToday = useCallback((didStudy, onStudied) => {
    const today = getPhDateKey();
    setStudyHistory((prev) => ({ ...prev, [today]: didStudy }));
    if (didStudy && onStudied) onStudied();
  }, [setStudyHistory]);

  const getStudiedToday = useCallback(() => studyHistory[getPhDateKey()], [studyHistory]);
  const getStudyStreak = useCallback(() => studyStreak(studyHistory), [studyHistory]);

  const value = useMemo(() => ({
    activeStudyGoal,
    studyHistory,
    setStudyGoal,
    clearStudyGoal,
    toggleStudyDate,
    markStudiedToday,
    getStudiedToday,
    getTodayStr: getPhDateKey,
    getStudyStreak,
    formatLocalDate: toDateKey,
  }), [activeStudyGoal, studyHistory, setStudyGoal, clearStudyGoal, toggleStudyDate, markStudiedToday, getStudiedToday, getStudyStreak]);

  return (
    <StudyGoalContext.Provider value={value}>
      {children}
    </StudyGoalContext.Provider>
  );
}

export function useStudyGoal() {
  const context = useContext(StudyGoalContext);
  if (!context) {
    throw new Error("useStudyGoal must be used within a StudyGoalProvider");
  }
  return context;
}

export default StudyGoalContext;
