import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getGlobalData,
  getLogForDate,
  getTodayKey,
  loadGlobalDataLocal,
  migrateOldData,
  saveGlobalDataLocal,
  subscribeToGlobalData,
  subscribeToTodayLog,
  updateGlobalData,
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

// Protocol categories
const PROTOCOL_CATEGORIES = [
  { id: "personal", label: "Personal", icon: "person" },
  { id: "work", label: "Work", icon: "work" },
  { id: "other", label: "Other", icon: "check" },
];

// LocalStorage keys (legacy - will be migrated)
const getStorageKeys = (category = "personal") => {
  const suffix = category === "personal" ? "" : `_${category}`;
  return {
    CUSTOM_TASKS: `protocol_custom_tasks${suffix}`,
    TASK_HISTORY: `protocol_task_history${suffix}`,
    TASK_ORDER: `protocol_task_order${suffix}`,
    TODAY_TASKS: `protocol_today_tasks${suffix}`,
  };
};

// Legacy keys for backward compat (always personal)
const STORAGE_KEYS = getStorageKeys("personal");

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

// Work and Other categories start with empty phases (same structure, no default tasks)
const EMPTY_PHASES = {
  morningIgnition: {
    id: "morningIgnition",
    title: "Morning Ignition",
    subtitle: "Add tasks to get started.",
    emoji: "🔥",
    buttonText: "I am Ready.",
    tasks: [],
  },
  arena: {
    id: "arena",
    title: "The Arena",
    subtitle: "Unlocks after Morning Ignition.",
    emoji: "⚔️",
    buttonText: "Battle Complete.",
    tasks: [],
  },
  maintenance: {
    id: "maintenance",
    title: "The Maintenance",
    subtitle: "Unlocks after The Arena.",
    emoji: "🔧",
    buttonText: "Maintenance Done.",
    tasks: [],
  },
  shutdown: {
    id: "shutdown",
    title: "The Shutdown",
    subtitle: "Unlocks after The Maintenance.",
    emoji: "🌙",
    buttonText: "Day Complete.",
    tasks: [],
  },
};

// Get the phases for a given category
const getPhasesForCategory = (category) => {
  if (category === "personal") return PHASES;
  return EMPTY_PHASES;
};

const PHASE_ORDER = ["morningIgnition", "arena", "maintenance", "shutdown"];

// Load custom tasks from localStorage
const loadCustomTasks = (category = "personal") => {
  try {
    const keys = getStorageKeys(category);
    const saved = localStorage.getItem(keys.CUSTOM_TASKS);
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : { morningIgnition: [], arena: [], maintenance: [], shutdown: [] };
  } catch {
    return { morningIgnition: [], arena: [], maintenance: [], shutdown: [] };
  }
};

// Load task history from localStorage
const loadTaskHistory = (category = "personal") => {
  try {
    const keys = getStorageKeys(category);
    const saved = localStorage.getItem(keys.TASK_HISTORY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

// Load task order from localStorage
const loadTaskOrder = (category = "personal") => {
  try {
    const keys = getStorageKeys(category);
    const saved = localStorage.getItem(keys.TASK_ORDER);
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

// Helper: Get today's date in local time (consistent with dataLogger)
const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Load today's task done states from localStorage
// Returns { phaseId: { taskId: boolean } } or null
const loadTodayTasks = (category = "personal") => {
  try {
    const keys = getStorageKeys(category);
    const saved = localStorage.getItem(keys.TODAY_TASKS);
    if (!saved) {
      console.log(`[Protocol:${category}] No saved tasks in localStorage`);
      return null;
    }

    const parsed = JSON.parse(saved);
    const today = getLocalDateKey();

    console.log(
      `[Protocol:${category}] Loading tasks - saved date:`,
      parsed.date,
      "today:",
      today,
    );

    // Only return if data is from today
    if (parsed && parsed.date === today && parsed.tasks) {
      console.log(`[Protocol:${category}] ✓ Restoring today's tasks from localStorage`);
      return parsed.tasks;
    }
    console.log(`[Protocol:${category}] Saved tasks are from a different day, ignoring`);
    return null; // Stale data from different day
  } catch (e) {
    console.error(`[Protocol:${category}] Load error:`, e);
    return null;
  }
};

// Save today's task done states to localStorage (called on every phaseTasks change)
const saveTodayTasks = (phaseTasks, category = "personal") => {
  try {
    const keys = getStorageKeys(category);
    const today = getLocalDateKey();
    const tasks = {};

    Object.entries(phaseTasks).forEach(([phaseId, taskList]) => {
      tasks[phaseId] = {};
      taskList.forEach((task) => {
        tasks[phaseId][task.id] = task.done;
      });
    });

    const data = {
      date: today,
      tasks: tasks,
      timestamp: Date.now(), // For conflict resolution
    };

    localStorage.setItem(keys.TODAY_TASKS, JSON.stringify(data));
    console.log(`[Protocol:${category}] ✓ Saved tasks to localStorage:`, data);
  } catch (e) {
    console.error(`[Protocol:${category}] Save error:`, e);
  }
};

// Build initial phaseTasks for a given category
const buildInitialPhaseTasks = (category = "personal") => {
  const categoryPhases = getPhasesForCategory(category);
  const custom = loadCustomTasks(category);
  const order = loadTaskOrder(category);
  const todayDone = loadTodayTasks(category);
  const initialTasks = {};

  PHASE_ORDER.forEach((phaseId) => {
    const defaultTasks = categoryPhases[phaseId].tasks;
    const phaseCustomTasks = custom && custom[phaseId] ? custom[phaseId] : [];
    let allTasks = [...defaultTasks, ...phaseCustomTasks];

    // Apply order if exists
    if (order[phaseId]) {
      const orderedIds = order[phaseId];
      allTasks.sort((a, b) => {
        const indexA = orderedIds.indexOf(a.id);
        const indexB = orderedIds.indexOf(b.id);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return 0;
      });
    }

    // Restore today's done states from localStorage
    if (todayDone && todayDone[phaseId]) {
      allTasks = allTasks.map((task) => ({
        ...task,
        done: todayDone[phaseId][task.id] ?? task.done,
      }));
    }

    initialTasks[phaseId] = allTasks;
  });
  return initialTasks;
};

export function ProtocolProvider({ children }) {
  // Current protocol category (personal / work / other)
  const [protocolCategory, setProtocolCategory] = useState(() => {
    try {
      return localStorage.getItem("protocol_active_category") || "personal";
    } catch {
      return "personal";
    }
  });

  // Current active phase
  const [activePhase, setActivePhase] = useState("morningIgnition");

  // Track completed phases
  const [completedPhases, setCompletedPhases] = useState([]);

  // Custom tasks added by user
  const [customTasks, setCustomTasks] = useState(() => loadCustomTasks(protocolCategory));

  // Task order state
  const [taskOrder, setTaskOrder] = useState(() => loadTaskOrder(protocolCategory));

  // Task states for each phase (combines default + custom)
  const [phaseTasks, setPhaseTasks] = useState(() => buildInitialPhaseTasks(protocolCategory));

  // History state: { "phaseId-taskId": { "YYYY-MM-DD": boolean } }
  const [taskHistory, setTaskHistory] = useState(() => loadTaskHistory(protocolCategory));

  // Switch protocol category
  const switchCategory = (newCategory) => {
    if (newCategory === protocolCategory) return;

    // Save current category state
    const currentKeys = getStorageKeys(protocolCategory);
    localStorage.setItem(currentKeys.CUSTOM_TASKS, JSON.stringify(customTasks));
    localStorage.setItem(currentKeys.TASK_HISTORY, JSON.stringify(taskHistory));
    localStorage.setItem(currentKeys.TASK_ORDER, JSON.stringify(taskOrder));
    saveTodayTasks(phaseTasks, protocolCategory);

    // Load new category state
    const newCustom = loadCustomTasks(newCategory);
    const newHistory = loadTaskHistory(newCategory);
    const newOrder = loadTaskOrder(newCategory);
    const newPhaseTasks = buildInitialPhaseTasks(newCategory);

    setProtocolCategory(newCategory);
    setCustomTasks(newCustom);
    setTaskHistory(newHistory);
    setTaskOrder(newOrder);
    setPhaseTasks(newPhaseTasks);
    setActivePhase("morningIgnition");
    setCompletedPhases([]);

    localStorage.setItem("protocol_active_category", newCategory);
  };

  // Save custom tasks to localStorage whenever they change
  useEffect(() => {
    const keys = getStorageKeys(protocolCategory);
    localStorage.setItem(
      keys.CUSTOM_TASKS,
      JSON.stringify(customTasks),
    );
  }, [customTasks, protocolCategory]);

  // Save task history to localStorage whenever it changes
  useEffect(() => {
    const keys = getStorageKeys(protocolCategory);
    localStorage.setItem(
      keys.TASK_HISTORY,
      JSON.stringify(taskHistory),
    );
  }, [taskHistory, protocolCategory]);

  // Save task order to localStorage whenever it changes
  useEffect(() => {
    const keys = getStorageKeys(protocolCategory);
    localStorage.setItem(keys.TASK_ORDER, JSON.stringify(taskOrder));
  }, [taskOrder, protocolCategory]);

  // 🛡️ CRITICAL: Save today's task done states to localStorage IMMEDIATELY on every change
  // This prevents data loss if user refreshes before Firestore sync completes
  useEffect(() => {
    saveTodayTasks(phaseTasks, protocolCategory);
  }, [phaseTasks, protocolCategory]);

  // Track if user is actively dragging (to prevent cloud sync interference)
  const isDragging = useRef(false);

  // 🛡️ MOUNT PROTECTION: Prevents cloud sync from overwriting local data during initial load
  const mountTimestamp = useRef(Date.now());
  const MOUNT_PROTECTION_DURATION = 3000; // 3 seconds grace period after mount
  const initialFetchDone = useRef(false); // Track if initial fetch completed

  // 🔄 INITIAL CLOUD FETCH on mount - Get global Protocol data AND today's tasks
  useEffect(() => {
    const fetchGlobalProtocol = async () => {
      try {
        // 1. Fetch global data (history, custom tasks, order)
        const globalKey = protocolCategory === "personal" ? "protocol" : `protocol_${protocolCategory}`;
        const cloudProtocol = await getGlobalData(globalKey);
        if (cloudProtocol) {
          console.log(`[Protocol:${protocolCategory}] ✓ Loaded global data from Firestore`);

          // MERGE task history (Union of performed tasks)
          if (cloudProtocol.taskHistory) {
            setTaskHistory((prev) => {
              const merged = { ...prev };
              Object.entries(cloudProtocol.taskHistory).forEach(
                ([key, dates]) => {
                  if (!merged[key]) merged[key] = {};
                  Object.assign(merged[key], dates);
                },
              );
              return merged;
            });
          }

          // MERGE custom tasks (Union by ID per phase)
          if (cloudProtocol.customTasks) {
            setCustomTasks((prev) => {
              const merged = { ...prev }; // Spread object, not array

              Object.entries(cloudProtocol.customTasks).forEach(
                ([phaseKey, phaseTasks]) => {
                  if (!Array.isArray(phaseTasks)) return;

                  if (!merged[phaseKey]) {
                    merged[phaseKey] = [];
                  }

                  const localTasks = merged[phaseKey];
                  phaseTasks.forEach((cloudTask) => {
                    if (!localTasks.find((t) => t.id === cloudTask.id)) {
                      localTasks.push(cloudTask);
                    }
                  });
                },
              );

              return merged;
            });
          }

          // MERGE task order
          if (
            cloudProtocol.taskOrder &&
            Object.keys(cloudProtocol.taskOrder).length > 0
          ) {
            setTaskOrder((prev) => {
              if (Object.keys(prev).length === 0)
                return cloudProtocol.taskOrder;
              return prev;
            });
          }

          // Cache global data locally for offline access
          saveGlobalDataLocal(globalKey, cloudProtocol);
        }

        // 2. Fetch today's daily log to get current task completion states
        const todayLog = await getLogForDate();
        const protocolLogKey = protocolCategory === "personal" ? "protocol" : `protocol_${protocolCategory}`;
        if (todayLog && todayLog[protocolLogKey] && todayLog[protocolLogKey].phases) {
          const remoteProtocol = todayLog[protocolLogKey];
          const remoteCustomTasks =
            remoteProtocol.custom_tasks &&
              !Array.isArray(remoteProtocol.custom_tasks)
              ? remoteProtocol.custom_tasks
              : null;
          const remoteOrder = remoteProtocol.task_order || null;

          // Apply today's task completion states from cloud
          const categoryPhases = getPhasesForCategory(protocolCategory);
          setPhaseTasks((prev) => {
            const next = {};
            const localSaved = loadTodayTasks(protocolCategory);
            // Determine which is newer: localStorage or cloud
            const keys = getStorageKeys(protocolCategory);
            const localTimestamp = localSaved
              ? JSON.parse(
                localStorage.getItem(keys.TODAY_TASKS) || "{}",
              ).timestamp || 0
              : 0;
            const cloudTimestamp = todayLog.timestamp_updated
              ? new Date(todayLog.timestamp_updated).getTime()
              : 0;
            const useCloud = cloudTimestamp > localTimestamp;

            PHASE_ORDER.forEach((phaseId) => {
              const defaultTasks = categoryPhases[phaseId].tasks;
              const customForPhase =
                remoteCustomTasks?.[phaseId] ||
                cloudProtocol?.customTasks?.[phaseId] ||
                prev[phaseId].filter((t) => t.isCustom);
              const phaseCustomTasks = Array.isArray(customForPhase)
                ? customForPhase
                : [];

              let allTasks = [
                ...defaultTasks.map((t) => ({ ...t, isCustom: false })),
                ...phaseCustomTasks.map((t) => ({ ...t, isCustom: true })),
              ];

              // Apply order
              const orderSource =
                remoteOrder?.[phaseId] || cloudProtocol?.taskOrder?.[phaseId];
              if (Array.isArray(orderSource) && orderSource.length > 0) {
                allTasks.sort((a, b) => {
                  const indexA = orderSource.indexOf(a.id);
                  const indexB = orderSource.indexOf(b.id);
                  if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                  if (indexA !== -1) return -1;
                  if (indexB !== -1) return 1;
                  return 0;
                });
              }

              // Apply completion states - use whichever is newer (cloud or local)
              if (useCloud && remoteProtocol.phases?.[phaseId]?.tasks) {
                const remotePhaseTasks = remoteProtocol.phases[phaseId].tasks;
                allTasks = allTasks.map((task) => {
                  const remoteTask = remotePhaseTasks.find(
                    (rt) => rt.id === task.id,
                  );
                  return {
                    ...task,
                    done: remoteTask ? remoteTask.done : task.done,
                  };
                });
              } else {
                // Keep localStorage state (already applied during init)
                const currentMap = new Map(prev[phaseId].map((t) => [t.id, t]));
                allTasks = allTasks.map((task) => {
                  const existing = currentMap.get(task.id);
                  return existing ? { ...task, done: existing.done } : task;
                });
              }

              next[phaseId] = allTasks;
            });

            if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
            console.log(`[Protocol:${protocolCategory}] ✓ Applied cloud task states on mount`);
            return next;
          });
        }

        initialFetchDone.current = true;
      } catch (error) {
        console.error("[Protocol] Failed to fetch global data:", error);
        initialFetchDone.current = true;
      }
    };

    fetchGlobalProtocol();
  }, [protocolCategory]); // Run when category changes

  // 🌐 Sync PROTOCOL DATA to GLOBAL storage (persists across days, for streaks)
  useEffect(() => {
    // 🛡️ MOUNT PROTECTION: Don't sync during initial load
    const timeSinceMount = Date.now() - mountTimestamp.current;
    if (timeSinceMount < MOUNT_PROTECTION_DURATION) {
      return;
    }

    // Only sync after user has actually interacted
    if (lastLocalInteraction.current === 0) {
      return;
    }

    const syncTimer = setTimeout(() => {
      const globalKey = protocolCategory === "personal" ? "protocol" : `protocol_${protocolCategory}`;
      console.log(`[Protocol:${protocolCategory}] Syncing global data (history, custom, order)...`);

      // Save to global_data/protocol (persists across days!)
      updateGlobalData(globalKey, {
        taskHistory: taskHistory,
        customTasks: customTasks,
        taskOrder: taskOrder,
      });

      // Also save locally for offline
      saveGlobalDataLocal(globalKey, {
        taskHistory,
        customTasks,
        taskOrder,
      });
    }, 1000);

    return () => clearTimeout(syncTimer);
  }, [taskHistory, customTasks, taskOrder, protocolCategory]);

  // 🚀 REAL-TIME CLOUD SYNC for global Protocol data
  useEffect(() => {
    const globalKey = protocolCategory === "personal" ? "protocol" : `protocol_${protocolCategory}`;
    const unsubscribe = subscribeToGlobalData(globalKey, (cloudProtocol) => {
      // 🛡️ MOUNT PROTECTION
      const timeSinceMount = Date.now() - mountTimestamp.current;
      if (timeSinceMount < MOUNT_PROTECTION_DURATION) {
        console.log(`[Protocol:${protocolCategory}] Mount protection active, skipping global sync`);
        return;
      }

      // Throttle
      if (
        Date.now() - lastLocalInteraction.current < 2000 ||
        isDragging.current
      )
        return;

      if (!cloudProtocol) return;

      console.log(`[Protocol:${protocolCategory}] Received global data from cloud`);

      // Cache locally for offline access
      saveGlobalDataLocal(globalKey, cloudProtocol);

      // Merge task history (union - never remove history entries)
      if (cloudProtocol.taskHistory) {
        setTaskHistory((prev) => {
          const merged = { ...prev };
          Object.entries(cloudProtocol.taskHistory).forEach(([key, dates]) => {
            if (!merged[key]) merged[key] = {};
            merged[key] = { ...merged[key], ...dates };
          });
          if (JSON.stringify(merged) === JSON.stringify(prev)) return prev;
          return merged;
        });
      }

      // Sync custom tasks
      if (cloudProtocol.customTasks) {
        setCustomTasks((prev) => {
          if (
            JSON.stringify(prev) === JSON.stringify(cloudProtocol.customTasks)
          )
            return prev;
          return cloudProtocol.customTasks;
        });
      }

      // Sync task order
      if (cloudProtocol.taskOrder) {
        setTaskOrder((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(cloudProtocol.taskOrder))
            return prev;
          return cloudProtocol.taskOrder;
        });
      }
    });

    return () => unsubscribe();
  }, [protocolCategory]);

  // Reorder tasks in a phase
  const reorderTasks = (phaseId, newOrder) => {
    lastLocalInteraction.current = Date.now();
    isDragging.current = true;

    setPhaseTasks((prev) => ({
      ...prev,
      [phaseId]: newOrder,
    }));

    setTaskOrder((prev) => ({
      ...prev,
      [phaseId]: newOrder.map((t) => t.id),
    }));

    // Clear dragging flag after a short delay
    setTimeout(() => {
      isDragging.current = false;
    }, 500);
  };

  // Reset task order to default
  const resetTaskOrder = () => {
    lastLocalInteraction.current = Date.now(); // Mark as user interaction so sync fires

    setTaskOrder({}); // Clear order state
    const keys = getStorageKeys(protocolCategory);
    localStorage.removeItem(keys.TASK_ORDER); // Clear storage

    // Reset phaseTasks to default order (Default + Custom appended)
    setPhaseTasks((prev) => {
      const newPhaseTasks = {};
      const categoryPhases = getPhasesForCategory(protocolCategory);
      PHASE_ORDER.forEach((phaseId) => {
        const defaultTasks = categoryPhases[phaseId].tasks;
        const phaseCustomTasks = customTasks[phaseId] || [];

        // Build a lookup of current done states
        const currentTasksMap = new Map(prev[phaseId].map((t) => [t.id, t]));

        // Default tasks first in template order, then custom tasks appended
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

  // Interaction timestamp to prevent "Cloud Echo" overwrites
  const lastLocalInteraction = useRef(0);

  // Toggle a task in a specific phase (TODAY)
  const toggleTask = (phaseId, taskId) => {
    lastLocalInteraction.current = Date.now(); // Mark interaction time

    setPhaseTasks((prev) => {
      const newTasks = prev[phaseId].map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task,
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
          task.id === taskId ? { ...task, done: !task.done } : task,
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
        task.id === taskId ? { ...task, done: true } : task,
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

  // Mark "Reflect on your day" as done (called when journal entry exists for today)
  const markReflectDone = () => {
    const phaseId = "arena";
    const taskId = 1; // "Reflect on your day" task

    setPhaseTasks((prev) => ({
      ...prev,
      [phaseId]: prev[phaseId].map((task) =>
        task.id === taskId ? { ...task, done: true } : task,
      ),
    }));

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

  // Auto-check "Reflect on your day" when a journal entry exists for today
  useEffect(() => {
    const unsubscribe = subscribeToGlobalData("journal", (journalData) => {
      if (!journalData || !journalData.entries) return;

      const today = formatLocalDate(new Date());
      const hasTodayEntry = journalData.entries.some((entry) => {
        // Check isoDate field (used by Journal page)
        return entry.isoDate === today;
      });

      if (hasTodayEntry) {
        // Only mark done if not already done (avoid unnecessary state updates)
        const reflectTask = phaseTasks.arena?.find((t) => t.id === 1);
        if (reflectTask && !reflectTask.done) {
          markReflectDone();
        }
      }
    });

    return () => unsubscribe();
  }, [phaseTasks.arena]);

  // Add a custom task to a phase
  const addCustomTask = (phaseId, task) => {
    lastLocalInteraction.current = Date.now();

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
    lastLocalInteraction.current = Date.now();

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
    const categoryPhases = getPhasesForCategory(protocolCategory);
    setActivePhase("morningIgnition");
    setCompletedPhases([]);
    setPhaseTasks({
      morningIgnition: categoryPhases.morningIgnition.tasks.map((t) => ({
        ...t,
        done: false,
      })),
      arena: categoryPhases.arena.tasks.map((t) => ({ ...t, done: false })),
      maintenance: categoryPhases.maintenance.tasks.map((t) => ({ ...t, done: false })),
      shutdown: categoryPhases.shutdown.tasks.map((t) => ({ ...t, done: false })),
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
    phaseTasks[phaseId].every((task) => task.done),
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

  // 🔄 Sync to Daily Log whenever tasks change (DEBOUNCED)
  useEffect(() => {
    // 🛡️ MOUNT PROTECTION: Don't sync to Firestore during initial load
    // This prevents new devices from overwriting cloud data with empty state
    const timeSinceMount = Date.now() - mountTimestamp.current;
    if (timeSinceMount < MOUNT_PROTECTION_DURATION) {
      console.log(
        "[Protocol] Mount protection active, skipping Firestore WRITE",
      );
      return; // Don't write to Firestore during mount protection
    }

    // Also check if user has actually interacted (not just initial render)
    if (lastLocalInteraction.current === 0) {
      console.log(
        "[Protocol] No user interaction yet, skipping Firestore WRITE",
      );
      return; // User hasn't toggled anything yet
    }

    // Debounce timer to prevent excessive writes
    const syncTimer = setTimeout(() => {
      const syncToDailyLog = () => {
        const logKey = protocolCategory === "personal" ? "protocol" : `protocol_${protocolCategory}`;
        console.log(`[Protocol:${protocolCategory}] Syncing to Firestore...`);

        // Calculate completion metrics
        const { totalDone, totalTasks } = getTotalProgress();
        const completionRate = totalTasks > 0 ? totalDone / totalTasks : 0;

        // Build phases data for LLM analysis
        const categoryPhases = getPhasesForCategory(protocolCategory);
        const phasesData = {};
        PHASE_ORDER.forEach((phaseId) => {
          const phase = categoryPhases[phaseId];
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

        // Update today's log (FIRESTORE SYNC)
        updateTodayLog(logKey, {
          completion_rate: completionRate,
          phases: phasesData,
          // PERSIST THESE TO CLOUD:
          custom_tasks: customTasks,
          task_order: taskOrder,

          total_completed: totalDone,
          total_tasks: totalTasks,
          all_phases_complete: allPhasesComplete,
        });

        console.log(`[Protocol:${protocolCategory}] ✓ Firestore sync complete`);
      };

      syncToDailyLog();
    }, 1000); // Wait 1 second of inactivity before writing to Firestore

    // Cleanup: cancel pending writes if state changes again
    return () => clearTimeout(syncTimer);
  }, [phaseTasks, customTasks, taskOrder, allPhasesComplete, protocolCategory]);

  // 🚀 REAL-TIME CLOUD SYNC (Listen for changes from other devices)
  useEffect(() => {
    // 1. Subscribe to Firestore updates for today
    const unsubscribe = subscribeToTodayLog((todayLog) => {
      // 🛡️ MOUNT PROTECTION: Skip cloud updates for first 3 seconds after page load
      const timeSinceMount = Date.now() - mountTimestamp.current;
      if (timeSinceMount < MOUNT_PROTECTION_DURATION) {
        console.log("[Protocol] Mount protection active, skipping cloud sync");
        return;
      }
      // Throttle: Ignore cloud updates if user just interacted locally (<2s) OR is actively dragging
      if (
        Date.now() - lastLocalInteraction.current < 2000 ||
        isDragging.current
      )
        return;

      if (!todayLog || !todayLog.protocol) return;

      const remoteProtocol = todayLog.protocol;

      // PREPARE DATA SOURCES
      // 1. Custom Tasks
      let remoteCustomTasks = remoteProtocol.custom_tasks;
      // Handle edge case where it might be initialized as empty array in dataLogger
      if (Array.isArray(remoteCustomTasks) || !remoteCustomTasks) {
        remoteCustomTasks = {
          morningIgnition: [],
          arena: [],
          maintenance: [],
          shutdown: [],
        };
      }
      // Update Custom Tasks State
      setCustomTasks(remoteCustomTasks);

      // 2. Task Order
      const remoteOrder = remoteProtocol.task_order || {};
      setTaskOrder(remoteOrder);

      // 3. REBUILD PHASE TASKS (The Source of Truth)
      setPhaseTasks((prev) => {
        const next = {};

        PHASE_ORDER.forEach((phaseId) => {
          // A. Combine Tasks
          const categoryPhases = getPhasesForCategory(protocolCategory);
          const defaultTasks = categoryPhases[phaseId].tasks;
          const phaseCustom = remoteCustomTasks[phaseId] || []; // Use remote custom tasks

          // Helper: Normalize task structure
          const normalize = (t, isCustom) => ({
            ...t,
            isCustom: !!isCustom,
            // Verify ID is present and valid
            id: t.id,
          });

          let allTasks = [
            ...defaultTasks.map((t) => normalize(t, false)),
            ...phaseCustom.map((t) => normalize(t, true)),
          ];

          // B. Apply Order
          const phaseOrder = remoteOrder[phaseId];
          if (Array.isArray(phaseOrder) && phaseOrder.length > 0) {
            allTasks.sort((a, b) => {
              const indexA = phaseOrder.indexOf(a.id);
              const indexB = phaseOrder.indexOf(b.id);
              if (indexA !== -1 && indexB !== -1) return indexA - indexB;
              if (indexA !== -1) return -1;
              if (indexB !== -1) return 1;
              return 0;
            });
          }

          // C. Sync Completion Status
          // We look at remoteProtocol.phases[phaseId].tasks for the authoritative 'done' status
          const remotePhaseData =
            (remoteProtocol.phases && remoteProtocol.phases[phaseId]) || {};
          const remotePhaseTasks = remotePhaseData.tasks || [];

          allTasks = allTasks.map((task) => {
            // Find matching task in remote phase data to get its 'done' status
            const remoteTask = remotePhaseTasks.find((rt) => rt.id === task.id);
            // If found, use remote done status. If not (newly added?), default to false.
            // But we try to preserve local 'prev' state if it really matters?
            // unique constraint: We are in "Cloud Truth" mode (quiet period). Trust cloud.
            return { ...task, done: remoteTask ? remoteTask.done : false };
          });

          next[phaseId] = allTasks;
        });

        // Use deep compare to avoid unnecessary re-renders if nothing changed?
        // JSON stringify is fast enough for this data size.
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        return next;
      });
    });

    return () => unsubscribe();
  }, []);

  // Get phases for the current category
  const currentPhases = getPhasesForCategory(protocolCategory);

  const value = {
    phases: currentPhases,
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

    // Category
    protocolCategory,
    protocolCategories: PROTOCOL_CATEGORIES,
    switchCategory,
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
