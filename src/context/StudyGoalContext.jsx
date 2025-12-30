import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { updateTodayLog } from "../services/dataLogger";

// LocalStorage keys
const STORAGE_KEYS = {
  ACTIVE_GOAL: "study_goal_active",
  STUDY_HISTORY: "study_goal_history",
};

// Helper to format date as YYYY-MM-DD using LOCAL timezone
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const StudyGoalContext = createContext(null);

// Load from localStorage
const loadActiveGoal = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_GOAL);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const loadStudyHistory = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDY_HISTORY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

export function StudyGoalProvider({ children }) {
  // Active study goal (selected certificate) - persisted
  const [activeStudyGoal, setActiveStudyGoal] = useState(loadActiveGoal);

  // Study history: { [dateStr]: true/false/undefined } - persisted
  const [studyHistory, setStudyHistory] = useState(loadStudyHistory);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.ACTIVE_GOAL,
      JSON.stringify(activeStudyGoal)
    );
  }, [activeStudyGoal]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.STUDY_HISTORY,
      JSON.stringify(studyHistory)
    );
  }, [studyHistory]);

  // Sync to dataLogger whenever data changes
  useEffect(() => {
    const today = formatLocalDate(new Date());
    updateTodayLog("growth", {
      active_study_goal: activeStudyGoal,
      study_history: studyHistory,
      study_streak: calculateStreak(studyHistory),
    });
  }, [activeStudyGoal, studyHistory]);

  // Calculate streak helper
  const calculateStreak = (history) => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = formatLocalDate(checkDate);

      if (history[dateStr] === true) {
        streak++;
      } else if (
        history[dateStr] === false ||
        (i > 0 && history[dateStr] === undefined)
      ) {
        break;
      }
    }
    return streak;
  };

  // Set a certificate as the active study goal
  const setStudyGoal = useCallback((certificate) => {
    setActiveStudyGoal(certificate);
  }, []);

  // Clear the active study goal
  const clearStudyGoal = useCallback(() => {
    setActiveStudyGoal(null);
  }, []);

  // Toggle study status for a date (cycle: undefined -> true -> false -> undefined)
  const toggleStudyDate = useCallback((dateStr) => {
    setStudyHistory((prev) => {
      const currentVal = prev[dateStr];
      let newVal;

      if (currentVal === undefined) {
        newVal = true; // Mark as studied
      } else if (currentVal === true) {
        newVal = false; // Mark as missed
      } else {
        newVal = undefined; // Clear
      }

      if (newVal === undefined) {
        const { [dateStr]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [dateStr]: newVal };
    });
  }, []);

  // Quick answer: Did you study today? (Yes/No buttons)
  // onStudied is an optional callback called when didStudy is true
  const markStudiedToday = useCallback((didStudy, onStudied) => {
    const today = formatLocalDate(new Date());
    setStudyHistory((prev) => ({
      ...prev,
      [today]: didStudy,
    }));

    // If studied and callback provided, call it (e.g., to mark Learn Stuff done)
    if (didStudy && onStudied) {
      onStudied();
    }
  }, []);

  // Check if studied today
  const getStudiedToday = useCallback(() => {
    const today = formatLocalDate(new Date());
    return studyHistory[today];
  }, [studyHistory]);

  // Get today's date string
  const getTodayStr = useCallback(() => {
    return formatLocalDate(new Date());
  }, []);

  // Calculate current streak
  const getStudyStreak = useCallback(() => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = formatLocalDate(checkDate);

      if (studyHistory[dateStr] === true) {
        streak++;
      } else if (
        studyHistory[dateStr] === false ||
        (i > 0 && studyHistory[dateStr] === undefined)
      ) {
        // Break streak on missed day or undefined (except today)
        break;
      }
    }

    return streak;
  }, [studyHistory]);

  const value = {
    activeStudyGoal,
    studyHistory,
    setStudyGoal,
    clearStudyGoal,
    toggleStudyDate,
    markStudiedToday,
    getStudiedToday,
    getTodayStr,
    getStudyStreak,
    formatLocalDate,
  };

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
