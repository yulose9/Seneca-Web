import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import {
  updateTodayLog,
  updateGlobalData,
  subscribeToGlobalData,
  hasPendingGlobalWrite,
  isGlobalDirty,
} from "../services/dataLogger";

// LocalStorage keys
const STORAGE_KEYS = {
  ACTIVE_GOAL: "study_goal_active",
  STUDY_HISTORY: "study_goal_history",
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
  // Interaction timestamp to prevent "Cloud Echo" overwrites
  const lastLocalInteraction = useRef(0);

  // Bumped when unsynced edits from a previous session must be re-sent
  const [resyncNonce, setResyncNonce] = useState(0);

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

  // Initial cloud state arrives through the real-time listener below (one shared
  // Firestore listener — no separate getDoc read).

  // 🌐 Sync StudyGoal to GLOBAL storage (persists across days)
  useEffect(() => {
    // Only sync after user has actually interacted. dataLogger holds the write
    // until the doc is hydrated from the server, so a new device can't clobber it.
    if (lastLocalInteraction.current === 0) return;

    const syncTimer = setTimeout(() => {
      console.log("[StudyGoal] Syncing to GLOBAL Firestore...");

      // 🌐 GLOBAL DATA: Save to global_data/studyGoal (persists across days!)
      updateGlobalData("studyGoal", {
        activeStudyGoal: activeStudyGoal,
        studyHistory: studyHistory,
      });

      // Daily log: Just summary for analytics
      updateTodayLog("growth", {
        active_study_goal: activeStudyGoal,
        study_streak: calculateStreak(studyHistory),
      });
    }, 800); // 800ms debounce

    return () => clearTimeout(syncTimer);
  }, [activeStudyGoal, studyHistory, resyncNonce]);

  // 🚀 REAL-TIME CLOUD SYNC for global StudyGoal data
  useEffect(() => {
    let handledDirty = false;
    const unsubscribe = subscribeToGlobalData("studyGoal", (cloudData, meta) => {
      if (!cloudData) return;

      // Local edits not yet on the server win; the settled state is re-delivered
      // (meta.replay) once they land, so nothing is dropped for good.
      if (
        hasPendingGlobalWrite("studyGoal") ||
        Date.now() - lastLocalInteraction.current < 1500
      ) return;

      // Unsynced edits from a previous session: keep local on top, then re-push
      const leftoverDirty = meta?.authoritative && !handledDirty && isGlobalDirty("studyGoal");
      if (meta?.authoritative) handledDirty = true;
      if (leftoverDirty) {
        setStudyHistory((prev) => ({ ...(cloudData.studyHistory || {}), ...prev }));
        lastLocalInteraction.current = Date.now();
        setResyncNonce((n) => n + 1);
        return;
      }

      console.log("[StudyGoal] Received global data from cloud");

      // 1. Sync Active Goal (null = cleared on another device)
      if (cloudData.activeStudyGoal !== undefined) {
        setActiveStudyGoal(prev => {
          if (JSON.stringify(prev) === JSON.stringify(cloudData.activeStudyGoal)) return prev;
          return cloudData.activeStudyGoal;
        });
      }

      // 2. Sync Study History
      if (cloudData.studyHistory) {
        // Cloud is authoritative here (clean state) — replace so removals sync
        setStudyHistory(prev => {
          if (JSON.stringify(prev) === JSON.stringify(cloudData.studyHistory)) return prev;
          return cloudData.studyHistory;
        });
      }
    });

    return () => unsubscribe();
  }, []);

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
    lastLocalInteraction.current = Date.now();
    setActiveStudyGoal(certificate);
  }, []);

  // Clear the active study goal
  const clearStudyGoal = useCallback(() => {
    lastLocalInteraction.current = Date.now();
    setActiveStudyGoal(null);
  }, []);

  // Toggle study status for a date (cycle: undefined -> true -> false -> undefined)
  const toggleStudyDate = useCallback((dateStr) => {
    lastLocalInteraction.current = Date.now();
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
    lastLocalInteraction.current = Date.now();
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
