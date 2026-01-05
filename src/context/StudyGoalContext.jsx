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
  subscribeToTodayLog,
  getLogForDate,
  updateGlobalData,
  subscribeToGlobalData,
  getGlobalData,
} from "../services/dataLogger";

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
  // Interaction timestamp to prevent "Cloud Echo" overwrites
  const lastLocalInteraction = useRef(0);

  // 🛡️ MOUNT PROTECTION: Prevents new devices from overwriting cloud data
  const mountTimestamp = useRef(Date.now());
  const MOUNT_PROTECTION_DURATION = 3000; // 3 seconds

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

  // 🔄 INITIAL CLOUD FETCH on mount - Get global StudyGoal data
  useEffect(() => {
    const fetchGlobalStudyGoal = async () => {
      try {
        const cloudData = await getGlobalData("studyGoal");
        if (cloudData) {
          console.log("[StudyGoal] ✓ Loaded global data from Firestore");

          if (cloudData.activeStudyGoal) {
            setActiveStudyGoal(cloudData.activeStudyGoal);
          }

          if (cloudData.studyHistory && Object.keys(cloudData.studyHistory).length > 0) {
            setStudyHistory(prev => {
              const merged = { ...prev };
              Object.assign(merged, cloudData.studyHistory);
              return merged;
            });
          }
        }
      } catch (error) {
        console.error("[StudyGoal] Failed to fetch global data:", error);
      }
    };

    fetchGlobalStudyGoal();
  }, []); // Run once on mount

  // 🌐 Sync StudyGoal to GLOBAL storage (persists across days)
  useEffect(() => {
    // 🛡️ MOUNT PROTECTION: Don't sync to Firestore during initial load
    const timeSinceMount = Date.now() - mountTimestamp.current;
    if (timeSinceMount < MOUNT_PROTECTION_DURATION) {
      console.log("[StudyGoal] Mount protection active, skipping Firestore WRITE");
      return;
    }

    // Only sync after user has actually interacted
    if (lastLocalInteraction.current === 0) {
      console.log("[StudyGoal] No user interaction yet, skipping Firestore WRITE");
      return;
    }

    const syncTimer = setTimeout(() => {
      const today = formatLocalDate(new Date());
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
  }, [activeStudyGoal, studyHistory]);

  // 🚀 REAL-TIME CLOUD SYNC for global StudyGoal data
  useEffect(() => {
    const unsubscribe = subscribeToGlobalData("studyGoal", (cloudData) => {
      // 🛡️ MOUNT PROTECTION: Skip cloud updates for first 3 seconds after page load
      const timeSinceMount = Date.now() - mountTimestamp.current;
      if (timeSinceMount < MOUNT_PROTECTION_DURATION) {
        console.log("[StudyGoal] Mount protection active, skipping cloud sync");
        return;
      }

      // Throttle: Ignore cloud updates if user just interacted locally (< 2s)
      if (Date.now() - lastLocalInteraction.current < 2000) return;

      if (!cloudData) return;

      console.log("[StudyGoal] Received global data from cloud");

      // 1. Sync Active Goal
      if (cloudData.activeStudyGoal) {
        setActiveStudyGoal(prev => {
          if (JSON.stringify(prev) === JSON.stringify(cloudData.activeStudyGoal)) return prev;
          return cloudData.activeStudyGoal;
        });
      }

      // 2. Sync Study History
      if (cloudData.studyHistory) {
        setStudyHistory(prev => {
          const merged = { ...prev, ...cloudData.studyHistory };
          if (JSON.stringify(merged) === JSON.stringify(prev)) return prev;
          return merged;
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
