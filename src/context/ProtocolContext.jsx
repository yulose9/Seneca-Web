import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getLogForDate,
  getTodayKey,
  migrateOldData,
  updateTodayLog,
} from "../services/dataLogger";

/**
 * Protocol Context - Daily Habits System
 *
 * Based on your 2026 goals, organized into 4 phases:
 * 1. Morning Ignition - Start of day rituals
 * 2. The Arena - Main productivity & growth
 * 3. The Maintenance - Midday self-care
 * 4. The Shutdown - Evening wind-down
 *
 * Now integrated with Daily Log system for LLM analysis.
 */

const ProtocolContext = createContext(null);

// LocalStorage keys (legacy - will be migrated)
const STORAGE_KEYS = {
  CUSTOM_TASKS: "protocol_custom_tasks",
  TASK_HISTORY: "protocol_task_history",
  TASK_ORDER: "protocol_task_order",
};

// Phase definitions with tasks from your habits list
const PHASES = {
  morningIgnition: {
    id: "morningIgnition",
    title: "Morning Ignition",
    subtitle: "Are you ready to command the day?",
    emoji: "🔥",
    buttonText: "I am Ready.",
    tasks: [
      { id: 1, title: "Pray", emoji: "🙏", done: false },
      { id: 2, title: "Fix Bed", emoji: "🛏️", done: false },
      { id: 3, title: "Coffee", emoji: "☕", done: false },
      { id: 4, title: "Breakfast", emoji: "🍳", done: false },
      { id: 5, title: "Morning Brush", emoji: "🪥", done: false },
      { id: 6, title: "Shower", emoji: "🚿", done: false },
    ],
  },
  arena: {
    id: "arena",
    title: "The Arena",
    subtitle: "Unlocks after Morning Ignition.",
    emoji: "⚔️",
    buttonText: "Battle Complete.",
    tasks: [
      { id: 1, title: "Reflect on your day", emoji: "💭", done: false },
      { id: 2, title: "Read News", emoji: "📰", done: false },
      { id: 3, title: "Read Book", emoji: "📚", done: false },
      { id: 4, title: "Learn Stuff", emoji: "🎓", done: false },
      { id: 5, title: "Workout", emoji: "💪", done: false },
    ],
  },
  maintenance: {
    id: "maintenance",
    title: "The Maintenance",
    subtitle: "Unlocks after The Arena.",
    emoji: "🔧",
    buttonText: "Maintenance Done.",
    tasks: [
      { id: 1, title: "Eat Lunch", emoji: "🍽️", done: false },
      { id: 2, title: "Toothbrush Lunch", emoji: "🪥", done: false },
      { id: 3, title: "Clean", emoji: "🧹", done: false },
    ],
  },
  shutdown: {
    id: "shutdown",
    title: "The Shutdown",
    subtitle: "Unlocks after The Maintenance.",
    emoji: "🌙",
    buttonText: "Day Complete.",
    tasks: [
      { id: 1, title: "Brush Before Sleep", emoji: "🪥", done: false },
      { id: 2, title: "Skin Care Evening", emoji: "✨", done: false },
      { id: 3, title: "Sleep", emoji: "😴", done: false },
    ],
  },
};

const PHASE_ORDER = ["morningIgnition", "arena", "maintenance", "shutdown"];

// Load custom tasks from localStorage
const loadCustomTasks = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_TASKS);
    return saved
      ? JSON.parse(saved)
      : { morningIgnition: [], arena: [], maintenance: [], shutdown: [] };
  } catch {
    return { morningIgnition: [], arena: [], maintenance: [], shutdown: [] };
  }
};

// Load task history from localStorage
const loadTaskHistory = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TASK_HISTORY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

// Load task order from localStorage
const loadTaskOrder = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TASK_ORDER);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

export function ProtocolProvider({ children }) {
  // Current active phase
  const [activePhase, setActivePhase] = useState("morningIgnition");

  // Track completed phases
  const [completedPhases, setCompletedPhases] = useState([]);

  // Custom tasks added by user
  const [customTasks, setCustomTasks] = useState(loadCustomTasks);

  // Task order state
  const [taskOrder, setTaskOrder] = useState(loadTaskOrder);

  // Task states for each phase (combines default + custom)
  const [phaseTasks, setPhaseTasks] = useState(() => {
    const custom = loadCustomTasks();
    const order = loadTaskOrder();
    const initialTasks = {};

    PHASE_ORDER.forEach((phaseId) => {
      const defaultTasks = PHASES[phaseId].tasks;
      const phaseCustomTasks = custom[phaseId] || [];
      let allTasks = [...defaultTasks, ...phaseCustomTasks];

      // Apply order if exists
      if (order[phaseId]) {
        const orderedIds = order[phaseId];
        allTasks.sort((a, b) => {
          const indexA = orderedIds.indexOf(a.id);
          const indexB = orderedIds.indexOf(b.id);
          // If both exist in order, sort by index
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          // If only A exists, A comes first
          if (indexA !== -1) return -1;
          // If only B exists, B comes first
          if (indexB !== -1) return 1;
          // If neither exists, keep original relative order
          return 0;
        });
      }
      initialTasks[phaseId] = allTasks;
    });
    return initialTasks;
  });

  // History state: { "phaseId-taskId": { "YYYY-MM-DD": boolean } }
  const [taskHistory, setTaskHistory] = useState(loadTaskHistory);

  // Save custom tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.CUSTOM_TASKS,
      JSON.stringify(customTasks)
    );
  }, [customTasks]);

  // Save task history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.TASK_HISTORY,
      JSON.stringify(taskHistory)
    );
  }, [taskHistory]);

  // Save task order to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASK_ORDER, JSON.stringify(taskOrder));
  }, [taskOrder]);

  // Reorder tasks in a phase
  const reorderTasks = (phaseId, newOrder) => {
    setPhaseTasks((prev) => ({
      ...prev,
      [phaseId]: newOrder,
    }));

    setTaskOrder((prev) => ({
      ...prev,
      [phaseId]: newOrder.map((t) => t.id),
    }));
  };

  // Reset task order to default
  const resetTaskOrder = () => {
    setTaskOrder({}); // Clear order state
    localStorage.removeItem(STORAGE_KEYS.TASK_ORDER); // Clear storage

    // Reset phaseTasks to default order (Default + Custom appended)
    setPhaseTasks((prev) => {
      const newPhaseTasks = {};
      PHASE_ORDER.forEach((phaseId) => {
        const defaultTasks = PHASES[phaseId].tasks;
        const phaseCustomTasks = customTasks[phaseId] || [];
        // Combine default and custom tasks.
        // We need to preserve the 'done' state from the current 'prev' state if possible,
        // or just rebuild the list.
        // Rebuilding is safer for order, but we must preserve 'done' status.

        const currentTasksMap = new Map(prev[phaseId].map((t) => [t.id, t]));

        const allTasks = [...defaultTasks, ...phaseCustomTasks].map((t) => {
          const existing = currentTasksMap.get(t.id);
          return existing ? { ...t, done: existing.done } : t;
        });

        newPhaseTasks[phaseId] = allTasks;
      });
      return newPhaseTasks;
    });
  };

  // Helper to get task key
  const getTaskKey = (phaseId, taskId) => `${phaseId}-${taskId}`;

  // Helper to format date as YYYY-MM-DD using LOCAL timezone
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Toggle a task in a specific phase (TODAY)
  const toggleTask = (phaseId, taskId) => {
    setPhaseTasks((prev) => {
      const newTasks = prev[phaseId].map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      );

      // Allow this update to happen
      return {
        ...prev,
        [phaseId]: newTasks,
      };
    });

    // Also update history for TODAY
    const today = formatLocalDate(new Date());
    const key = getTaskKey(phaseId, taskId);

    setTaskHistory((prev) => {
      const taskHistoryData = prev[key] || {};
      // Determine new state based on the *next* state of the task
      // We need to look up valid current state first or just toggle it from history perspective.
      // Since setState is async, determining 'newDone' takes a moment.
      // Safer way: Read the *current* done state, invert it.
      const currentPhaseData = phaseTasks[phaseId];
      const task = currentPhaseData.find((t) => t.id === taskId);
      const nextDone = !task.done; // Inverting current state

      return {
        ...prev,
        [key]: {
          ...taskHistoryData,
          [today]: nextDone,
        },
      };
    });
  };

  // Toggle history for a specific date (Grid Interaction)
  const toggleTaskHistory = (phaseId, taskId, dateStr) => {
    const key = getTaskKey(phaseId, taskId);
    const today = formatLocalDate(new Date());

    // Update History
    setTaskHistory((prev) => {
      const taskHistoryData = prev[key] || {};
      const currentVal = !!taskHistoryData[dateStr];
      return {
        ...prev,
        [key]: {
          ...taskHistoryData,
          [dateStr]: !currentVal,
        },
      };
    });

    // If the date is TODAY, we must also sync the main 'done' state
    if (dateStr === today) {
      // We just call the standard toggle which handles both,
      // OR we manually update phaseTasks to avoid double-history-update loop.
      // Better to manually update phaseTasks here to avoid recursion loop.
      setPhaseTasks((prev) => ({
        ...prev,
        [phaseId]: prev[phaseId].map((task) =>
          task.id === taskId ? { ...task, done: !task.done } : task
        ),
      }));
    }
  };

  // Get history for a task
  const getTaskHistory = (phaseId, taskId) => {
    const key = getTaskKey(phaseId, taskId);
    return taskHistory[key] || {};
  };

  // Mark "Learn Stuff" as done (called from StudyGoalContext when studying)
  // This does NOT toggle - it only marks as done
  const markLearnStuffDone = () => {
    const phaseId = "arena";
    const taskId = 4; // "Learn Stuff" task

    // Update today's task state
    setPhaseTasks((prev) => ({
      ...prev,
      [phaseId]: prev[phaseId].map((task) =>
        task.id === taskId ? { ...task, done: true } : task
      ),
    }));

    // Update history for today
    const today = formatLocalDate(new Date());
    const key = getTaskKey(phaseId, taskId);
    setTaskHistory((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [today]: true,
      },
    }));
  };

  // Check if Learn Stuff is done today
  const isLearnStuffDone = () => {
    const task = phaseTasks.arena.find((t) => t.id === 4);
    return task?.done || false;
  };

  // Add a custom task to a phase
  const addCustomTask = (phaseId, task) => {
    // Update custom tasks registry
    setCustomTasks((prev) => ({
      ...prev,
      [phaseId]: [...prev[phaseId], task],
    }));

    // Add to phase tasks
    setPhaseTasks((prev) => ({
      ...prev,
      [phaseId]: [...prev[phaseId], { ...task, done: false }],
    }));
  };

  // Remove a custom task from a phase
  const removeCustomTask = (phaseId, taskId) => {
    // Remove from custom tasks registry
    setCustomTasks((prev) => ({
      ...prev,
      [phaseId]: prev[phaseId].filter((t) => t.id !== taskId),
    }));

    // Remove from phase tasks
    setPhaseTasks((prev) => ({
      ...prev,
      [phaseId]: prev[phaseId].filter((t) => t.id !== taskId),
    }));

    // Clean up history for this task
    const key = getTaskKey(phaseId, taskId);
    setTaskHistory((prev) => {
      const newHistory = { ...prev };
      delete newHistory[key];
      return newHistory;
    });
  };

  // Get custom task info (for display in HabitDetailSheet)
  const getCustomTaskInfo = (phaseId, taskId) => {
    const task = customTasks[phaseId]?.find((t) => t.id === taskId);
    return task || null;
  };

  // Check if a phase is complete (all tasks done)
  const isPhaseComplete = (phaseId) => {
    return phaseTasks[phaseId].every((task) => task.done);
  };

  // Get completed count for a phase
  const getPhaseProgress = (phaseId) => {
    const tasks = phaseTasks[phaseId];
    const completed = tasks.filter((t) => t.done).length;
    return { completed, total: tasks.length };
  };

  // Progress to next phase
  const completePhase = (phaseId) => {
    if (!isPhaseComplete(phaseId)) return;

    const currentIndex = PHASE_ORDER.indexOf(phaseId);
    const nextPhase = PHASE_ORDER[currentIndex + 1];

    setCompletedPhases((prev) => [...prev, phaseId]);

    if (nextPhase) {
      setActivePhase(nextPhase);
    } else {
      // All phases complete!
      setActivePhase(null);
    }
  };

  // Check if phase is unlocked
  const isPhaseUnlocked = (phaseId) => {
    const phaseIndex = PHASE_ORDER.indexOf(phaseId);
    if (phaseIndex === 0) return true; // First phase always unlocked

    const prevPhase = PHASE_ORDER[phaseIndex - 1];
    return isPhaseComplete(prevPhase);
  };

  // Check if phase is the active one
  const isPhaseActive = (phaseId) => {
    return activePhase === phaseId;
  };

  // Reset all phases (for a new day)
  const resetAllPhases = () => {
    setActivePhase("morningIgnition");
    setCompletedPhases([]);
    setPhaseTasks({
      morningIgnition: PHASES.morningIgnition.tasks.map((t) => ({
        ...t,
        done: false,
      })),
      arena: PHASES.arena.tasks.map((t) => ({ ...t, done: false })),
      maintenance: PHASES.maintenance.tasks.map((t) => ({ ...t, done: false })),
      shutdown: PHASES.shutdown.tasks.map((t) => ({ ...t, done: false })),
    });
  };

  // Get current status for Home screen - DYNAMIC based on actual task state
  const getCurrentStatus = () => {
    // Check all phases in order, find the first one that's not complete
    for (const phaseId of PHASE_ORDER) {
      const tasks = phaseTasks[phaseId];
      const allDone = tasks.every((t) => t.done);
      if (!allDone) {
        const phase = PHASES[phaseId];
        const completed = tasks.filter((t) => t.done).length;
        return {
          phase: phase.title,
          completed,
          total: tasks.length,
        };
      }
    }
    // All phases complete!
    return { phase: "All Complete", completed: 0, total: 0 };
  };

  // Check if ALL tasks across ALL phases are done
  const allPhasesComplete = PHASE_ORDER.every((phaseId) =>
    phaseTasks[phaseId].every((task) => task.done)
  );

  // Calculate total progress across all phases
  const getTotalProgress = () => {
    let totalDone = 0;
    let totalTasks = 0;
    PHASE_ORDER.forEach((phaseId) => {
      const tasks = phaseTasks[phaseId];
      totalDone += tasks.filter((t) => t.done).length;
      totalTasks += tasks.length;
    });
    return { totalDone, totalTasks };
  };

  const isOrderCustomized = Object.keys(taskOrder).length > 0;

  // 🔄 Sync to Daily Log whenever tasks change
  useEffect(() => {
    const syncToDailyLog = () => {
      // Calculate completion metrics
      const { totalDone, totalTasks } = getTotalProgress();
      const completionRate = totalTasks > 0 ? totalDone / totalTasks : 0;

      // Build phases data for LLM analysis
      const phasesData = {};
      PHASE_ORDER.forEach((phaseId) => {
        const phase = PHASES[phaseId];
        const tasks = phaseTasks[phaseId];
        const completed = tasks.filter((t) => t.done).length;
        const total = tasks.length;

        phasesData[phaseId] = {
          title: phase.title,
          emoji: phase.emoji,
          completed,
          total,
          completion_rate: total > 0 ? completed / total : 0,
          is_complete: completed === total,
          tasks: tasks.map((task) => ({
            id: task.id,
            title: task.title,
            emoji: task.emoji,
            done: task.done,
            is_custom: task.isCustom || false,
          })),
        };
      });

      // Update today's log
      updateTodayLog("protocol", {
        completion_rate: completionRate,
        phases: phasesData,
        custom_tasks: customTasks,
        total_completed: totalDone,
        total_tasks: totalTasks,
        all_phases_complete: allPhasesComplete,
      });
    };

    syncToDailyLog();
  }, [phaseTasks, customTasks, allPhasesComplete]);

  // 🚀 Run migration on mount
  useEffect(() => {
    migrateOldData();
  }, []);

  const value = {
    phases: PHASES,
    phaseOrder: PHASE_ORDER,
    phaseTasks,

    // History
    taskHistory,
    toggleTaskHistory,
    getTaskHistory,

    // State
    activePhase,
    completedPhases,
    allPhasesComplete,
    isOrderCustomized,

    // Actions
    toggleTask,
    reorderTasks,
    completePhase,
    resetAllPhases,
    markLearnStuffDone,
    isLearnStuffDone,

    // Custom tasks
    customTasks,
    addCustomTask,
    removeCustomTask,
    getCustomTaskInfo,

    // Helpers
    isPhaseComplete,
    isPhaseUnlocked,
    isPhaseActive,
    getPhaseProgress,
    getCurrentStatus,
    getTotalProgress,

    // Legacy compatibility for Home screen - DYNAMIC
    get tasks() {
      return phaseTasks.morningIgnition;
    },
    get completedCount() {
      const status = getCurrentStatus();
      return status.completed;
    },
    get totalCount() {
      const status = getCurrentStatus();
      return status.total;
    },
    get progress() {
      const status = getCurrentStatus();
      return status.total > 0
        ? Math.round((status.completed / status.total) * 100)
        : 100;
    },
    get isComplete() {
      return allPhasesComplete;
    },
  };

  return (
    <ProtocolContext.Provider value={value}>
      {children}
    </ProtocolContext.Provider>
  );
}

export function useProtocol() {
  const context = useContext(ProtocolContext);
  if (!context) {
    throw new Error("useProtocol must be used within a ProtocolProvider");
  }
  return context;
}
