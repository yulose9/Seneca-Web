import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useProtocol } from '../context/ProtocolContext';

export default function HabitStreakGrid({
    weeksToShow = 3,
    color = '#5856D6',
    className
}) {
    const { phases, taskHistory, phaseTasks } = useProtocol();

    // 1. Calculate total number of tasks defined in the system
    const allTasks = Object.values(phases).flatMap(phase =>
        phase.tasks.map(task => ({ phaseId: phase.id, taskId: task.id }))
    );
    const totalTasksCount = allTasks.length;

    // Helper to format YYYY-MM-DD using LOCAL timezone (not UTC!)
    const formatDateKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const today = new Date();
    const todayStr = formatDateKey(today);

    // Helper to get completion stats
    const getDailyStats = (dateStr) => {
        let completed = 0;

        // For TODAY, use the real-time phaseTasks state
        if (dateStr === todayStr) {
            Object.keys(phaseTasks).forEach(phaseId => {
                phaseTasks[phaseId].forEach(task => {
                    if (task.done) {
                        completed++;
                    }
                });
            });
        } else {
            // For past dates, use taskHistory
            allTasks.forEach(({ phaseId, taskId }) => {
                const key = `${phaseId}-${taskId}`;
                if (taskHistory[key] && taskHistory[key][dateStr]) {
                    completed++;
                }
            });
        }

        return {
            completed,
            total: totalTasksCount,
            percentage: totalTasksCount > 0 ? (completed / totalTasksCount) : 0
        };
    };

    // 3. Calculate Streak Stats
    const stats = useMemo(() => {
        let currentStreak = 0;
        let totalPerfectDays = 0;

        // Calculate Total Perfect Days (iterate all history?)
        // Since history keys are infinite, we roughly scan the last year or just rely on what we have.
        // Efficiently we can identify perfect days from keys, but keys are by task.
        // Iterating by Day is safer. Let's scan last 365 days for "Total" stats.
        const today = new Date();
        const scanDate = new Date(today);

        // Scan backwards 1 year for Total stats
        for (let i = 0; i < 365; i++) {
            const dStr = formatDateKey(scanDate);
            const { percentage } = getDailyStats(dStr);
            if (percentage === 1) totalPerfectDays++;
            scanDate.setDate(scanDate.getDate() - 1);
        }

        // Calculate Current Streak
        // Logic: Streak continues if Today is perfect OR Yesterday was perfect (if today incomplete).
        // Standard app logic usually allows "today" to be incomplete while preserving streak from yesterday.
        let checkDate = new Date(today);
        const todayStr = formatDateKey(checkDate);
        const todayStats = getDailyStats(todayStr);

        if (todayStats.percentage < 1) {
            // Today not perfect, check if streak ended yesterday
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
            const dStr = formatDateKey(checkDate);
            const { percentage } = getDailyStats(dStr);
            if (percentage === 1) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        return { currentStreak, totalPerfectDays };
    }, [taskHistory, totalTasksCount, phaseTasks, todayStr]); // Recalculate when history or today's tasks change

    // 2. Generate date range aligned to MONDAY
    const dates = [];
    const gridToday = new Date();
    gridToday.setHours(0, 0, 0, 0);

    const dayOfWeek = gridToday.getDay();
    const currentDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const mondayOfCurrentWeek = new Date(gridToday);
    mondayOfCurrentWeek.setDate(gridToday.getDate() - currentDayIndex);

    const startDate = new Date(mondayOfCurrentWeek);
    startDate.setDate(mondayOfCurrentWeek.getDate() - ((weeksToShow - 1) * 7));

    const totalDays = weeksToShow * 7;

    for (let i = 0; i < totalDays; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        dates.push(new Date(d));
    }

    const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    return (
        <div className={clsx("w-full pt-4", className)}>

            {/* Streak Header */}
            <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-[13px] font-semibold text-[rgba(60,60,67,0.6)] uppercase tracking-wide">
                    Consistency
                </span>
                <div className="flex gap-4">
                    <div className="text-right flex items-baseline gap-1.5">
                        <span className="text-[16px] font-bold tabular-nums text-black">
                            {stats.currentStreak}
                        </span>
                        <span className="text-[11px] font-bold text-[#FF9500] uppercase">
                            Streak
                        </span>
                    </div>
                </div>
            </div>

            {/* Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-[11px] font-bold text-[#8E8E93]/80 uppercase tracking-wide">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-2">
                {dates.map((date, index) => {
                    const isFuture = date > gridToday;
                    if (isFuture) {
                        return <div key={index} className="aspect-square rounded-[6px] bg-[rgba(120,120,128,0.08)] opacity-30" />;
                    }

                    const dateStr = formatDateKey(date);
                    const { completed, total, percentage } = getDailyStats(dateStr);
                    const isToday = formatDateKey(date) === formatDateKey(today);
                    const isComplete = percentage === 1;

                    // Calculate stepped intensity based on completed count
                    // 0 = dark/failed, 1-3 = light, 4-6 = medium, 7+ = bright, all = solid + glow
                    let bgStyle = {};
                    let glowStyle = {};

                    if (completed === 0) {
                        // No habits done - dark gray (failed/missed)
                        bgStyle = { backgroundColor: '#2C2C2E' };
                    } else if (isComplete) {
                        // ALL habits done - solid color with glow effect
                        bgStyle = { backgroundColor: color };
                        glowStyle = { boxShadow: `0 0 12px ${color}80, 0 2px 8px ${color}60` };
                    } else {
                        // Partial completion - stepped intensity based on count
                        // Map completed count to opacity: 1-3 = 0.35, 4-6 = 0.55, 7-10 = 0.75, 11-16 = 0.9
                        let stepOpacity;
                        if (completed <= 3) {
                            stepOpacity = 0.35;
                        } else if (completed <= 6) {
                            stepOpacity = 0.55;
                        } else if (completed <= 10) {
                            stepOpacity = 0.75;
                        } else {
                            stepOpacity = 0.9;
                        }
                        bgStyle = { backgroundColor: color, opacity: stepOpacity };
                    }

                    return (
                        <motion.div
                            key={index}
                            className={clsx(
                                "aspect-square rounded-[4px] relative transition-all duration-300",
                                isToday && "ring-2 ring-offset-2 ring-offset-white ring-[#007AFF]",
                                isComplete && "scale-100"
                            )}
                            style={{ ...bgStyle, ...glowStyle }}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{
                                scale: isComplete && isToday ? 1.05 : 1,
                                opacity: bgStyle.opacity || 1
                            }}
                            transition={{
                                delay: index * 0.02,
                                scale: { type: "spring", stiffness: 400, damping: 25 }
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
