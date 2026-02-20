import confetti from "canvas-confetti";
import clsx from "clsx";
import {
  AnimatePresence,
  motion,
  Reorder,
  useDragControls,
} from "framer-motion";
import { Bell, Briefcase, Check, CheckCircle, ChevronRight, Plus, RotateCcw, User } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import AddTaskSheet from "../components/AddTaskSheet";
import HabitDetailSheet from "../components/HabitDetailSheet";
import { TasksReminderSettingsSheet } from "../components/ObligationReminder";
import PageTransition from "../components/PageTransition";
import { useProtocol } from "../context/ProtocolContext";

// Format current date iOS style
const formatDate = () => {
  const now = new Date();
  const options = { weekday: "long", month: "short", day: "numeric" };
  return now.toLocaleDateString("en-US", options).toUpperCase();
};

// iOS 18 Style Checkbox
const Checkbox = ({ done, onClick }) => {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx("ios-checkbox", done && "checked")}
    >
      {done && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <Check
            size={14}
            strokeWidth={3}
            className="ios-checkbox-icon"
            style={{ opacity: 1, transform: "scale(1)" }}
          />
        </motion.div>
      )}
    </motion.button>
  );
};

// Long-press Reorder Item - requires hold before drag activates
const LONG_PRESS_DELAY = 500; // ms before drag activates
const MOVE_THRESHOLD = 8; // px - cancel long press if finger moves

const LongPressReorderItem = ({ children, value, className }) => {
  const controls = useDragControls();
  const timerRef = useRef(null);
  const startPosRef = useRef(null);
  const isDragActiveRef = useRef(false);
  const [isHolding, setIsHolding] = useState(false);

  const clearLongPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsHolding(false);
    isDragActiveRef.current = false;
    startPosRef.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      // Only handle primary button / first touch
      if (e.button !== 0 && e.button !== undefined) return;

      // Prevent text/image selection during long press
      e.preventDefault();

      startPosRef.current = { x: e.clientX, y: e.clientY };
      isDragActiveRef.current = false;

      timerRef.current = setTimeout(() => {
        isDragActiveRef.current = true;
        setIsHolding(true);

        // Haptic feedback on supported devices
        if (navigator.vibrate) navigator.vibrate(30);

        // Start drag with a fresh PointerEvent at the stored position
        const dragEvent = new PointerEvent("pointerdown", {
          clientX: startPosRef.current?.x ?? e.clientX,
          clientY: startPosRef.current?.y ?? e.clientY,
          bubbles: true,
          cancelable: true,
          pointerId: e.pointerId,
          pointerType: e.pointerType,
        });
        controls.start(dragEvent);
      }, LONG_PRESS_DELAY);
    },
    [controls],
  );

  useEffect(() => {
    const handleMove = (e) => {
      // If drag is already active, let framer-motion handle it
      if (isDragActiveRef.current) return;

      // If still in long-press wait, cancel if finger moved too much
      if (startPosRef.current && timerRef.current) {
        const dx = Math.abs(e.clientX - startPosRef.current.x);
        const dy = Math.abs(e.clientY - startPosRef.current.y);
        if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
          clearLongPress();
        }
      }
    };

    const handleUp = () => {
      clearLongPress();
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [clearLongPress]);

  return (
    <Reorder.Item
      value={value}
      as="div"
      dragListener={false}
      dragControls={controls}
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
        zIndex: 50,
      }}
      onDragEnd={clearLongPress}
      className={className}
      onPointerDown={handlePointerDown}
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "pan-y",
      }}
    >
      <motion.div
        animate={
          isHolding ? { scale: 1.01, opacity: 0.92 } : { scale: 1, opacity: 1 }
        }
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {children}
      </motion.div>
    </Reorder.Item>
  );
};

// Task Row Component
const TaskRow = ({ task, onToggle, onClick, isLast }) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "flex items-center py-4 px-4 cursor-pointer bg-white transition-colors",
        !isLast && "border-b border-[rgba(60,60,67,0.12)]",
      )}
    >
      <Checkbox done={task.done} onClick={onToggle} />
      <span className="text-2xl mx-3 select-none">{task.emoji}</span>
      <span
        className={clsx(
          "flex-1 text-[17px] transition-all duration-200",
          task.done
            ? "text-[rgba(60,60,67,0.3)] line-through decoration-[rgba(60,60,67,0.2)]"
            : "text-black",
        )}
      >
        {task.title}
      </span>
      <ChevronRight size={18} className="text-[#C7C7CC] ml-2" />
    </div>
  );
};

// Category icon mapping
const categoryIcons = {
  personal: User,
  work: Briefcase,
  other: CheckCircle,
};

// Category active colors
const categoryColors = {
  personal: "#007AFF",
  work: "#8DB600",
  other: "#FF4E6B",
};

// Protocol Category Pill Selector (inspired by iPhone Mail app)
const CategoryPillSelector = ({ categories, activeCategory, onCategoryChange }) => {
  return (
    <div className="protocol-pill-container">
      <div className="protocol-pill-track">
        {categories.map((cat) => {
          const isActive = cat.id === activeCategory;
          const IconComp = categoryIcons[cat.id];
          const activeColor = categoryColors[cat.id];
          return (
            <motion.button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={clsx(
                "protocol-pill",
                isActive ? "protocol-pill-active" : "protocol-pill-inactive",
              )}
              style={{
                backgroundColor: isActive ? activeColor : "#808080",
                boxShadow: isActive
                  ? `0 3px 12px ${activeColor}40`
                  : "none",
              }}
              layout
              transition={{
                layout: { type: "spring", stiffness: 500, damping: 35 },
              }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="protocol-pill-content"
                layout
                transition={{
                  layout: { type: "spring", stiffness: 500, damping: 35 },
                }}
              >
                <IconComp
                  size={18}
                  strokeWidth={2}
                  className="protocol-pill-icon"
                />
                <AnimatePresence mode="popLayout">
                  {isActive && (
                    <motion.span
                      key={`label-${cat.id}`}
                      className="protocol-pill-label"
                      initial={{ maxWidth: 0, opacity: 0, marginLeft: 0 }}
                      animate={{ maxWidth: 120, opacity: 1, marginLeft: 4 }}
                      exit={{ maxWidth: 0, opacity: 0, marginLeft: 0 }}
                      transition={{
                        maxWidth: { type: "spring", stiffness: 500, damping: 35 },
                        opacity: { duration: 0.15, delay: 0.05 },
                        marginLeft: { type: "spring", stiffness: 500, damping: 35 },
                      }}
                      style={{ overflow: "hidden", whiteSpace: "nowrap", display: "inline-block" }}
                    >
                      {cat.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// Empty state for work/other categories
const EmptyCategoryState = ({ categoryLabel }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="protocol-empty-state"
    >
      <div className="protocol-empty-icon">📋</div>
      <h3 className="protocol-empty-title">No {categoryLabel} Tasks Yet</h3>
      <p className="protocol-empty-subtitle">
        Tap the <strong>+</strong> button above to add your first task.
      </p>
    </motion.div>
  );
};

// Phase Section Component
const PhaseSection = ({
  phaseId,
  phase,
  tasks,
  isExpanded,
  isUnlocked,
  onToggleTask,
  onToggleExpand,
  onTaskPress,
  onReorder,
  progress,
}) => {
  const allTasksDone = tasks.every((t) => t.done);
  const isPhaseComplete = allTasksDone;

  return (
    <section className="ios-list-section">
      {/* Section Header */}
      <div
        onClick={() => onToggleExpand(phaseId)}
        className="flex items-center justify-between px-4 mb-2 cursor-pointer"
      >
        <h3 className="ios-list-header px-0 pb-0">{phase.title}</h3>
        <div className="flex items-center gap-2">
          {!isUnlocked && (
            <span className="ios-pill ios-pill-gray text-[11px]">Locked</span>
          )}
          {isPhaseComplete && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="ios-pill ios-pill-green text-[11px]"
            >
              Completed
            </motion.span>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <ChevronRight size={16} className="text-[#C7C7CC]" />
          </motion.div>
        </div>
      </div>

      {/* iOS Inset Grouped List */}
      <div
        className={clsx(
          "ios-inset-grouped mx-4",
          !isUnlocked && "opacity-50 grayscale",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
                opacity: { duration: 0.2 },
              }}
              className="overflow-hidden"
            >
              <Reorder.Group
                axis="y"
                values={tasks}
                onReorder={(newOrder) => onReorder(phaseId, newOrder)}
                as="div"
              >
                {tasks.map((task, index) => (
                  <LongPressReorderItem
                    key={task.id}
                    value={task}
                    className="relative"
                  >
                    <TaskRow
                      task={task}
                      onToggle={() => onToggleTask(phaseId, task.id)}
                      onClick={() => onTaskPress(phaseId, task)}
                      isLast={index === tasks.length - 1}
                    />
                  </LongPressReorderItem>
                ))}
              </Reorder.Group>
            </motion.div>
          ) : (
            // Collapsed Summary View
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
              }}
              onClick={() => onToggleExpand(phaseId)}
              whileTap={{ scale: 0.98 }}
              className={clsx(
                "p-4 flex items-center justify-between cursor-pointer rounded-xl shadow-sm",
                isPhaseComplete ? "bg-[#34C759]" : "bg-white",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{phase.emoji}</span>
                <span
                  className={clsx(
                    "text-[17px] font-medium transition-colors",
                    isPhaseComplete ? "text-white" : "text-black",
                  )}
                >
                  {isPhaseComplete
                    ? "All Habits Done"
                    : `${progress.completed}/${progress.total} Completed`}
                </span>
              </div>
              {isPhaseComplete ? (
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <Check size={14} className="text-white" strokeWidth={3} />
                </div>
              ) : (
                <ChevronRight size={18} className="text-[#C7C7CC]" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default function Protocol() {
  const {
    phases,
    phaseOrder,
    allPhasesComplete,
    toggleTask,
    completePhase,
    phaseTasks,
    isPhaseUnlocked,
    getPhaseProgress,
    toggleTaskHistory,
    getTaskHistory,
    addCustomTask,
    removeCustomTask,
    reorderTasks,
    resetTaskOrder,
    isOrderCustomized,
    protocolCategory,
    protocolCategories,
    switchCategory,
  } = useProtocol();

  const [expandedPhases, setExpandedPhases] = useState(["morningIgnition"]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [addTaskSheetVisible, setAddTaskSheetVisible] = useState(false);
  const [tasksReminderSettings, setTasksReminderSettings] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);

  // Check if current category has any tasks
  const hasTasks = phaseOrder.some(
    (phaseId) => phaseTasks[phaseId] && phaseTasks[phaseId].length > 0,
  );

  const activeCategoryLabel = protocolCategories.find(
    (c) => c.id === protocolCategory,
  )?.label || "";

  // Track previous completion state to trigger auto-advance
  const prevCompletedRef = useRef({});

  useEffect(() => {
    phaseOrder.forEach((phaseId, index) => {
      const currentPhaseTasks = phaseTasks[phaseId];
      // Skip empty phases - they shouldn't trigger auto-advance
      if (currentPhaseTasks.length === 0) return;

      const isComplete = currentPhaseTasks.every((t) => t.done);
      const wasComplete = prevCompletedRef.current[phaseId];

      // If phase JUST became complete (transition from incomplete -> complete)
      if (isComplete && !wasComplete) {
        const nextPhaseId = phaseOrder[index + 1];

        // Don't auto-collapse - let the user see the completed state
        // Only auto-expand the next phase
        setExpandedPhases((prev) => {
          let newState = [...prev];
          if (nextPhaseId && !newState.includes(nextPhaseId)) {
            newState = [...newState, nextPhaseId];
          }
          return newState;
        });
      }

      // Update ref
      prevCompletedRef.current[phaseId] = isComplete;
    });
  }, [phaseTasks, phaseOrder]);

  useEffect(() => {
    if (allPhasesComplete && hasTasks) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#007AFF", "#34C759", "#FF9500", "#5856D6"],
      });
    }
  }, [allPhasesComplete, hasTasks]);

  const handleTaskPress = (phaseId, task) => {
    setSelectedHabit({ ...task, phaseId });
    setSheetVisible(true);
  };

  const handleToggleExpand = (phaseId) => {
    setExpandedPhases((prev) =>
      prev.includes(phaseId)
        ? prev.filter((p) => p !== phaseId)
        : [...prev, phaseId],
    );
  };

  const handleCompletePhase = (phaseId) => {
    completePhase(phaseId);
  };

  return (
    <PageTransition className="min-h-screen bg-[#F2F2F7] pb-32">
      {/* iOS 18 Large Title */}
      <header className="pt-14 px-5 pb-6 bg-[#F2F2F7]">
        <div className="flex items-center justify-between">
          <div>
            <p className="ios-nav-date">{formatDate()}</p>
            <h1 className="ios-large-title">Protocol</h1>
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {isOrderCustomized && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={resetTaskOrder}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-200"
                  aria-label="Reset Order"
                >
                  <RotateCcw size={20} className="text-[#007AFF]" />
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setTasksReminderSettings(true)}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-200"
              aria-label="Reminder Settings"
            >
              <Bell size={20} className="text-[#FF9500]" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setAddTaskSheetVisible(true)}
              className="w-10 h-10 rounded-full bg-[#007AFF] flex items-center justify-center shadow-lg shadow-[#007AFF]/25"
            >
              <Plus size={22} strokeWidth={2.5} className="text-white" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Category Pill Selector */}
      <CategoryPillSelector
        categories={protocolCategories}
        activeCategory={protocolCategory}
        onCategoryChange={switchCategory}
      />

      {/* Phase Sections */}
      <AnimatePresence mode="wait">
        <motion.div
          key={protocolCategory}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
          {hasTasks ? (
            phaseOrder
              .filter((phaseId) => {
                // For non-personal: hide empty scheduled phases (but always show general if it has tasks)
                if (protocolCategory !== "personal" && phaseId !== "general") {
                  return phaseTasks[phaseId] && phaseTasks[phaseId].length > 0;
                }
                return true;
              })
              .map((phaseId) => (
                <PhaseSection
                  key={phaseId}
                  phaseId={phaseId}
                  phase={phases[phaseId]}
                  tasks={phaseTasks[phaseId] || []}
                  isExpanded={phaseId === "general" ? true : expandedPhases.includes(phaseId)}
                  isUnlocked={phaseId === "general" ? true : isPhaseUnlocked(phaseId)}
                  onToggleTask={toggleTask}
                  onToggleExpand={handleToggleExpand}
                  onCompletePhase={handleCompletePhase}
                  onTaskPress={handleTaskPress}
                  onReorder={reorderTasks}
                  progress={getPhaseProgress(phaseId)}
                />
              ))
          ) : (
            <EmptyCategoryState categoryLabel={activeCategoryLabel} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Habit Detail Sheet */}
      <HabitDetailSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        habit={selectedHabit}
        onToggleHistory={toggleTaskHistory}
        getHistory={getTaskHistory}
        onDeleteCustomTask={removeCustomTask}
      />

      {/* Add Task Sheet */}
      <AddTaskSheet
        visible={addTaskSheetVisible}
        onClose={() => setAddTaskSheetVisible(false)}
        onAddTask={addCustomTask}
        protocolCategory={protocolCategory}
      />

      {/* Tasks Reminder Settings */}
      <TasksReminderSettingsSheet
        visible={tasksReminderSettings}
        onClose={() => setTasksReminderSettings(false)}
      />
    </PageTransition>
  );
}
