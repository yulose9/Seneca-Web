import React, { createContext, useContext, useState } from 'react';

/**
 * Protocol Context - Daily Habits System
 * 
 * Based on your 2026 goals, organized into 4 phases:
 * 1. Morning Ignition - Start of day rituals
 * 2. The Arena - Main productivity & growth
 * 3. The Maintenance - Midday self-care
 * 4. The Shutdown - Evening wind-down
 */

const ProtocolContext = createContext(null);

// Phase definitions with tasks from your habits list
const PHASES = {
    morningIgnition: {
        id: 'morningIgnition',
        title: 'Morning Ignition',
        subtitle: 'Are you ready to command the day?',
        emoji: '🔥',
        buttonText: 'I am Ready.',
        tasks: [
            { id: 1, title: 'Pray', emoji: '🙏', done: false },
            { id: 2, title: 'Fix Bed', emoji: '🛏️', done: false },
            { id: 3, title: 'Coffee', emoji: '☕', done: false },
            { id: 4, title: 'Breakfast', emoji: '🍳', done: false },
            { id: 5, title: 'Morning Brush', emoji: '🪥', done: false },
            { id: 6, title: 'Shower', emoji: '🚿', done: false },
        ],
    },
    arena: {
        id: 'arena',
        title: 'The Arena',
        subtitle: 'Unlocks after Morning Ignition.',
        emoji: '⚔️',
        buttonText: 'Battle Complete.',
        tasks: [
            { id: 1, title: 'Reflect on your day', emoji: '💭', done: false },
            { id: 2, title: 'Read News', emoji: '📰', done: false },
            { id: 3, title: 'Read Book', emoji: '📚', done: false },
            { id: 4, title: 'Learn Stuff', emoji: '🎓', done: false },
            { id: 5, title: 'Workout', emoji: '💪', done: false },
        ],
    },
    maintenance: {
        id: 'maintenance',
        title: 'The Maintenance',
        subtitle: 'Unlocks after The Arena.',
        emoji: '🔧',
        buttonText: 'Maintenance Done.',
        tasks: [
            { id: 1, title: 'Eat Lunch', emoji: '🍽️', done: false },
            { id: 2, title: 'Toothbrush Lunch', emoji: '🪥', done: false },
            { id: 3, title: 'Clean', emoji: '🧹', done: false },
        ],
    },
    shutdown: {
        id: 'shutdown',
        title: 'The Shutdown',
        subtitle: 'Unlocks after The Maintenance.',
        emoji: '🌙',
        buttonText: 'Day Complete.',
        tasks: [
            { id: 1, title: 'Brush Before Sleep', emoji: '🪥', done: false },
            { id: 2, title: 'Skin Care Evening', emoji: '✨', done: false },
            { id: 3, title: 'Sleep', emoji: '😴', done: false },
        ],
    },
};

const PHASE_ORDER = ['morningIgnition', 'arena', 'maintenance', 'shutdown'];

export function ProtocolProvider({ children }) {
    // Current active phase
    const [activePhase, setActivePhase] = useState('morningIgnition');

    // Track completed phases
    const [completedPhases, setCompletedPhases] = useState([]);

    // Task states for each phase
    const [phaseTasks, setPhaseTasks] = useState({
        morningIgnition: [...PHASES.morningIgnition.tasks],
        arena: [...PHASES.arena.tasks],
        maintenance: [...PHASES.maintenance.tasks],
        shutdown: [...PHASES.shutdown.tasks],
    });

    // History state: { "phaseId-taskId": { "YYYY-MM-DD": boolean } }
    const [taskHistory, setTaskHistory] = useState({});

    // Helper to get task key
    const getTaskKey = (phaseId, taskId) => `${phaseId}-${taskId}`;

    // Helper to format date as YYYY-MM-DD using LOCAL timezone
    const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Toggle a task in a specific phase (TODAY)
    const toggleTask = (phaseId, taskId) => {
        setPhaseTasks(prev => {
            const newTasks = prev[phaseId].map(task =>
                task.id === taskId ? { ...task, done: !task.done } : task
            );

            // Allow this update to happen
            return {
                ...prev,
                [phaseId]: newTasks
            };
        });

        // Also update history for TODAY
        const today = formatLocalDate(new Date());
        const key = getTaskKey(phaseId, taskId);

        setTaskHistory(prev => {
            const taskHistoryData = prev[key] || {};
            // Determine new state based on the *next* state of the task
            // We need to look up valid current state first or just toggle it from history perspective.
            // Since setState is async, determining 'newDone' takes a moment.
            // Safer way: Read the *current* done state, invert it.
            const currentPhaseData = phaseTasks[phaseId];
            const task = currentPhaseData.find(t => t.id === taskId);
            const nextDone = !task.done; // Inverting current state

            return {
                ...prev,
                [key]: {
                    ...taskHistoryData,
                    [today]: nextDone
                }
            };
        });
    };

    // Toggle history for a specific date (Grid Interaction)
    const toggleTaskHistory = (phaseId, taskId, dateStr) => {
        const key = getTaskKey(phaseId, taskId);
        const today = formatLocalDate(new Date());

        // Update History
        setTaskHistory(prev => {
            const taskHistoryData = prev[key] || {};
            const currentVal = !!taskHistoryData[dateStr];
            return {
                ...prev,
                [key]: {
                    ...taskHistoryData,
                    [dateStr]: !currentVal
                }
            };
        });

        // If the date is TODAY, we must also sync the main 'done' state
        if (dateStr === today) {
            // We just call the standard toggle which handles both, 
            // OR we manually update phaseTasks to avoid double-history-update loop.
            // Better to manually update phaseTasks here to avoid recursion loop.
            setPhaseTasks(prev => ({
                ...prev,
                [phaseId]: prev[phaseId].map(task =>
                    task.id === taskId ? { ...task, done: !task.done } : task
                )
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
        const phaseId = 'arena';
        const taskId = 4; // "Learn Stuff" task

        // Update today's task state
        setPhaseTasks(prev => ({
            ...prev,
            [phaseId]: prev[phaseId].map(task =>
                task.id === taskId ? { ...task, done: true } : task
            )
        }));

        // Update history for today
        const today = formatLocalDate(new Date());
        const key = getTaskKey(phaseId, taskId);
        setTaskHistory(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                [today]: true
            }
        }));
    };

    // Check if Learn Stuff is done today
    const isLearnStuffDone = () => {
        const task = phaseTasks.arena.find(t => t.id === 4);
        return task?.done || false;
    };

    // Check if a phase is complete (all tasks done)
    const isPhaseComplete = (phaseId) => {
        return phaseTasks[phaseId].every(task => task.done);
    };

    // Get completed count for a phase
    const getPhaseProgress = (phaseId) => {
        const tasks = phaseTasks[phaseId];
        const completed = tasks.filter(t => t.done).length;
        return { completed, total: tasks.length };
    };

    // Progress to next phase
    const completePhase = (phaseId) => {
        if (!isPhaseComplete(phaseId)) return;

        const currentIndex = PHASE_ORDER.indexOf(phaseId);
        const nextPhase = PHASE_ORDER[currentIndex + 1];

        setCompletedPhases(prev => [...prev, phaseId]);

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
        setActivePhase('morningIgnition');
        setCompletedPhases([]);
        setPhaseTasks({
            morningIgnition: PHASES.morningIgnition.tasks.map(t => ({ ...t, done: false })),
            arena: PHASES.arena.tasks.map(t => ({ ...t, done: false })),
            maintenance: PHASES.maintenance.tasks.map(t => ({ ...t, done: false })),
            shutdown: PHASES.shutdown.tasks.map(t => ({ ...t, done: false })),
        });
    };

    // Get current status for Home screen - DYNAMIC based on actual task state
    const getCurrentStatus = () => {
        // Check all phases in order, find the first one that's not complete
        for (const phaseId of PHASE_ORDER) {
            const tasks = phaseTasks[phaseId];
            const allDone = tasks.every(t => t.done);
            if (!allDone) {
                const phase = PHASES[phaseId];
                const completed = tasks.filter(t => t.done).length;
                return {
                    phase: phase.title,
                    completed,
                    total: tasks.length,
                };
            }
        }
        // All phases complete!
        return { phase: 'All Complete', completed: 0, total: 0 };
    };

    // Check if ALL tasks across ALL phases are done
    const allPhasesComplete = PHASE_ORDER.every(phaseId =>
        phaseTasks[phaseId].every(task => task.done)
    );

    // Calculate total progress across all phases
    const getTotalProgress = () => {
        let totalDone = 0;
        let totalTasks = 0;
        PHASE_ORDER.forEach(phaseId => {
            const tasks = phaseTasks[phaseId];
            totalDone += tasks.filter(t => t.done).length;
            totalTasks += tasks.length;
        });
        return { totalDone, totalTasks };
    };

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

        // Actions
        toggleTask,
        completePhase,
        resetAllPhases,
        markLearnStuffDone,
        isLearnStuffDone,

        // Helpers
        isPhaseComplete,
        isPhaseUnlocked,
        isPhaseActive,
        getPhaseProgress,
        getCurrentStatus,
        getTotalProgress,

        // Legacy compatibility for Home screen - DYNAMIC
        get tasks() { return phaseTasks.morningIgnition; },
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
            return status.total > 0 ? Math.round((status.completed / status.total) * 100) : 100;
        },
        get isComplete() { return allPhasesComplete; },
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
        throw new Error('useProtocol must be used within a ProtocolProvider');
    }
    return context;
}
