import React, { createContext, useContext, useState } from 'react';

/**
 * Personal Goals Context
 * 
 * Manages personal habit/goal tracking separate from the Protocol system
 * Examples: No Porn, Exercise, Weight tracking
 */

const PersonalGoalsContext = createContext(null);

// Default goals structure
const DEFAULT_GOALS = {
    noPorn: {
        id: 'noPorn',
        title: 'No Porn',
        emoji: '🚫',
        color: '#8B5CF6',
        type: 'habit', // Simple daily check
    },
    exercise: {
        id: 'exercise',
        title: 'Exercise',
        emoji: '🏋️',
        color: '#007AFF',
        type: 'weight', // Has weight tracking
        currentWeight: 120,
        goalWeight: 90,
    }
};

// Helper to format date as YYYY-MM-DD using LOCAL timezone
const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export function PersonalGoalsProvider({ children }) {
    // Goals definitions
    const [goals, setGoals] = useState(DEFAULT_GOALS);

    // History: { "goalId": { "YYYY-MM-DD": true/false } }
    // true = completed/success, false = failed, undefined = no data
    const [goalHistory, setGoalHistory] = useState({});

    // Toggle a goal for a specific date
    const toggleGoalDate = (goalId, dateStr) => {
        setGoalHistory(prev => {
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
                    [goalId]: rest
                };
            }

            return {
                ...prev,
                [goalId]: {
                    ...goalData,
                    [dateStr]: newVal
                }
            };
        });
    };

    // Get history for a specific goal
    const getGoalHistory = (goalId) => {
        return goalHistory[goalId] || {};
    };

    // Update weight for exercise goal
    const updateWeight = (newWeight) => {
        setGoals(prev => ({
            ...prev,
            exercise: {
                ...prev.exercise,
                currentWeight: newWeight
            }
        }));
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
        throw new Error('usePersonalGoals must be used within a PersonalGoalsProvider');
    }
    return context;
}
