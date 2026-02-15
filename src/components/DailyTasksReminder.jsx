import { AnimatePresence, motion } from "framer-motion";
import { ListChecks, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { usePersonalGoals } from "../context/PersonalGoalsContext";
import { useProtocol } from "../context/ProtocolContext";
import { useStudyGoal } from "../context/StudyGoalContext";

// Helper to get today's date as YYYY-MM-DD in local tz
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function DailyTasksReminder({ isOpen, onClose }) {
  const {
    phaseTasks,
    phaseOrder,
    phases,
    allPhasesComplete,
    getTotalProgress,
  } = useProtocol();

  const { activeStudyGoal, getStudiedToday } = useStudyGoal();
  const { goalHistory } = usePersonalGoals();

  const today = getTodayStr();
  const studiedToday = getStudiedToday();
  const noPornToday = goalHistory?.noPorn?.[today];
  const exerciseToday = goalHistory?.exercise?.[today];

  // Build list of pending items
  const pendingItems = useMemo(() => {
    const items = [];

    // Protocol tasks — gather undone tasks across all phases (group under "Protocol")
    if (!allPhasesComplete) {
      phaseOrder.forEach((phaseId) => {
        const tasks = phaseTasks[phaseId] || [];
        tasks.forEach((task) => {
          if (!task.done) {
            items.push({
              id: `protocol-${phaseId}-${task.id}`,
              label: task.title || task.label || "Task",
              emoji: task.emoji || "📋",
              group: "protocol",
              category: "Protocol",
              categoryColor: getCategoryColor("protocol"),
              done: false,
            });
          }
        });
      });
    }

    // Study Goal → Growth group
    if (activeStudyGoal && studiedToday !== true) {
      items.push({
        id: "study",
        label: `Study: ${activeStudyGoal.name}`,
        emoji: "📚",
        group: "growth",
        category: "Growth",
        categoryColor: getCategoryColor("growth"),
        done: false,
      });
    }

    // No Porn → Growth group
    if (noPornToday !== true) {
      items.push({
        id: "noporn",
        label: "Stay clean today",
        emoji: "🛡️",
        group: "growth",
        category: "Growth",
        categoryColor: getCategoryColor("growth"),
        done: false,
      });
    }

    // Exercise → Growth group
    if (exerciseToday !== true) {
      items.push({
        id: "exercise",
        label: "Workout",
        emoji: "💪",
        group: "growth",
        category: "Growth",
        categoryColor: getCategoryColor("growth"),
        done: false,
      });
    }

    return items;
  }, [
    allPhasesComplete,
    phaseTasks,
    phaseOrder,
    phases,
    activeStudyGoal,
    studiedToday,
    noPornToday,
    exerciseToday,
  ]);

  // If nothing pending, don't show
  if (pendingItems.length === 0 && isOpen) {
    // Auto-dismiss if everything's done
    onClose?.();
    return null;
  }

  // Group by category (Protocol vs Growth)
  const grouped = useMemo(() => {
    const map = {};
    pendingItems.forEach((item) => {
      if (!map[item.category]) {
        map[item.category] = { color: item.categoryColor, items: [] };
      }
      map[item.category].items.push(item);
    });
    // Ensure Protocol comes first
    const ordered = {};
    if (map["Protocol"]) ordered["Protocol"] = map["Protocol"];
    if (map["Growth"]) ordered["Growth"] = map["Growth"];
    return ordered;
  }, [pendingItems]);

  const { totalDone, totalTasks } = (() => {
    try {
      const tp = getTotalProgress();
      let total = tp.totalTasks;
      let done = tp.totalDone;
      // Add personal goals
      if (activeStudyGoal) {
        total++;
        if (studiedToday === true) done++;
      }
      total += 2; // noporn + exercise
      if (noPornToday === true) done++;
      if (exerciseToday === true) done++;
      return { totalDone: done, totalTasks: total };
    } catch {
      return { totalDone: 0, totalTasks: pendingItems.length };
    }
  })();

  const completionPct =
    totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  return (
    <AnimatePresence>
      {isOpen && pendingItems.length > 0 && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed inset-x-5 top-1/2 -translate-y-1/2 z-[10000] max-w-md mx-auto"
          >
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col select-none">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#FF9500] to-[#FFAD33] px-6 pt-6 pb-5 relative shrink-0">
                {/* Close button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                >
                  <X size={16} className="text-white" />
                </motion.button>

                <div className="flex items-center gap-2.5 mb-3 pr-10">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <ListChecks size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-white">
                      Today's Remaining
                    </h3>
                    <p className="text-[12px] text-white/70 font-medium">
                      {totalDone}/{totalTasks} completed • {completionPct}%
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPct}%` }}
                    transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                  />
                </div>
              </div>

              {/* Pending items — scrollable */}
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                {Object.entries(grouped).map(([category, { color, items }]) => (
                  <div key={category}>
                    <p
                      className="text-[12px] font-semibold uppercase tracking-wide mb-2"
                      style={{ color }}
                    >
                      {category} — {items.length} remaining
                    </p>
                    <div className="space-y-1.5">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-[rgba(120,120,128,0.04)]"
                        >
                          <span className="text-base shrink-0">{item.emoji}</span>
                          <p className="text-[14px] text-[#1C1C1E] font-medium truncate">
                            {item.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Motivational message */}
                <div className="pt-1 pb-1">
                  <p className="text-center text-[14px] text-[rgba(60,60,67,0.5)] leading-relaxed italic">
                    {pendingItems.length <= 3
                      ? "Almost there — just a few more to go. 💪"
                      : "One task at a time. You've got this. 🔥"}
                  </p>
                </div>
              </div>

              {/* Dismiss */}
              <div className="px-6 pb-6 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="w-full py-3.5 rounded-xl bg-[rgba(120,120,128,0.08)] text-[15px] font-semibold text-[rgba(60,60,67,0.8)] flex items-center justify-center gap-2"
                >
                  Got it
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function getCategoryColor(type) {
  switch (type) {
    case "protocol":
      return "#FF9500";
    case "growth":
      return "#34C759";
    default:
      return "#8E8E93";
  }
}
