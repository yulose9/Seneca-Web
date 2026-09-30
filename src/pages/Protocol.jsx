import confetti from "canvas-confetti";
import { useWebHaptics } from "web-haptics/react";
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
import PageHeader from "../components/PageHeader";
import {
  ICON_ENTER,
  ICON_SPRING,
  FADE,
  FADE_EXIT,
  ICON_VISIBLE,
  LAYOUT_SPRING,
  TAP,
  TAP_CARD,
  TAP_TRANSITION,
} from "../constants/motion";
import { useProtocol } from "../context/ProtocolContext";
import { getPhDateKey } from "../utils/timeUtils";

// iOS 18 Style Checkbox
const Checkbox = ({ done, onClick }) => {
  return (
    <motion.button
      whileTap={TAP}
      aria-pressed={done}
      aria-label={done ? "Mark as not done" : "Mark as done"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        "ios-checkbox relative after:content-[''] after:absolute after:-inset-4 after:bg-transparent",
        done && "checked"
      )}
    >
      <AnimatePresence initial={false}>
        {done && (
          <motion.div
            key="check"
            initial={ICON_ENTER}
            animate={ICON_VISIBLE}
            exit={ICON_ENTER}
            transition={ICON_SPRING}
            className="flex items-center justify-center"
          >
            <Check
              size={14}
              strokeWidth={3}
              className="ios-checkbox-icon"
              style={{ opacity: 1, transform: "none" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
        transition={LAYOUT_SPRING}
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
        "flex items-center min-h-[52px] py-3 px-4 cursor-pointer bg-surface transition-colors active:bg-fill",
        !isLast && "border-b border-separator",
      )}
    >
      {/* overflow-visible so the ::before hit-slop isn't clipped by the row */}
      <div className="overflow-visible flex-shrink-0">
        <Checkbox done={task.done} onClick={onToggle} />
      </div>
      <span className="text-title-2 mx-3 select-none">{task.emoji}</span>
      <span
        className={clsx(
          "flex-1 text-body transition-colors duration-150",
          task.done
            ? "text-ink-3 line-through decoration-separator"
            : "text-ink",
        )}
      >
        {task.title}
      </span>
      <ChevronRight size={18} className="text-ink-3 ml-2" />
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
                backgroundColor: isActive ? activeColor : "var(--color-ink-2)",
                boxShadow: isActive
                  ? `0 3px 12px ${activeColor}40`
                  : "none",
              }}
              layout
              transition={{ layout: LAYOUT_SPRING, scale: TAP_TRANSITION }}
              whileTap={TAP}
              aria-pressed={isActive}
              aria-label={cat.label}
            >
              <motion.div
                className="protocol-pill-content"
                layout
                transition={{ layout: LAYOUT_SPRING }}
              >
                <IconComp
                  size={18}
                  strokeWidth={2}
                  className="protocol-pill-icon"
                />
                <AnimatePresence mode="popLayout" initial={false}>
                  {isActive && (
                    <motion.span
                      key={`label-${cat.id}`}
                      className="protocol-pill-label ml-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: FADE }}
                      exit={{ opacity: 0, transition: FADE_EXIT }}
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={LAYOUT_SPRING}
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
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => onToggleExpand(phaseId)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpand(phaseId);
          }
        }}
        className="flex items-center justify-between px-4 mb-2 cursor-pointer active:opacity-60"
      >
        <h3 className="ios-list-header px-0 pb-0">{phase.title}</h3>
        <div className="flex items-center gap-2">
          <AnimatePresence initial={false}>
            {!isUnlocked && (
              <motion.span
                key="locked"
                exit={{ opacity: 0, scale: 0.9, transition: FADE_EXIT }}
                className="ios-pill ios-pill-gray text-caption-2"
              >
                Locked
              </motion.span>
            )}
          </AnimatePresence>
          {isPhaseComplete && (
            <motion.span
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={ICON_SPRING}
              className="ios-pill ios-pill-green text-caption-2"
            >
              Completed
            </motion.span>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={LAYOUT_SPRING}
          >
            <ChevronRight size={16} className="text-ink-3" />
          </motion.div>
        </div>
      </div>

      {/* iOS Inset Grouped List */}
      <motion.div
        layout
        transition={LAYOUT_SPRING}
        className={clsx(
          "ios-inset-grouped relative mx-4 transition-[opacity,filter] duration-300 ease-out",
          !isUnlocked && "opacity-50 grayscale",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: FADE }}
              exit={{ opacity: 0, transition: FADE_EXIT }}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: FADE }}
              exit={{ opacity: 0, transition: FADE_EXIT }}
              onClick={() => onToggleExpand(phaseId)}
              whileTap={TAP_CARD}
              className={clsx(
                "p-4 flex items-center justify-between cursor-pointer rounded-xl shadow-card",
                isPhaseComplete ? "bg-positive" : "bg-surface",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-title-2">{phase.emoji}</span>
                <span
                  className={clsx(
                    "text-body font-medium tabular-nums transition-colors",
                    isPhaseComplete ? "text-white" : "text-ink",
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
                <ChevronRight size={18} className="text-ink-3" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
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

  const haptic = useWebHaptics();
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
      // Skip undefined or empty phases - they shouldn't trigger auto-advance
      if (!currentPhaseTasks || currentPhaseTasks.length === 0) return;

      const isComplete = currentPhaseTasks.every((t) => t.done);
      const wasComplete = prevCompletedRef.current[phaseId];

      // If phase JUST became complete (transition from incomplete -> complete)
      if (isComplete && !wasComplete) {
        haptic.trigger("success");
        const nextPhaseId = phaseOrder[index + 1];

        // Auto-collapse the completed phase and expand the next phase
        setExpandedPhases((prev) => {
          let newState = prev.filter(p => p !== phaseId); // Collapse current
          if (nextPhaseId && !newState.includes(nextPhaseId)) {
            newState = [...newState, nextPhaseId]; // Expand next
          }
          return newState;
        });
      }

      // Update ref
      prevCompletedRef.current[phaseId] = isComplete;
    });
  }, [phaseTasks, phaseOrder]);

  // Celebrate the moment of completion (false -> true), never the state:
  // mounting, reloading or switching to an already-finished category stays quiet,
  // and each category celebrates at most once per day.
  const allDone = allPhasesComplete && hasTasks;
  const prevAllDoneRef = useRef(allDone);
  const prevCategoryRef = useRef(protocolCategory);
  useEffect(() => {
    const wasDone = prevAllDoneRef.current;
    const categoryChanged = prevCategoryRef.current !== protocolCategory;
    prevAllDoneRef.current = allDone;
    prevCategoryRef.current = protocolCategory;
    if (!allDone || wasDone || categoryChanged) return;

    const key = `seneca_celebrated_${getPhDateKey()}_${protocolCategory}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // Storage unavailable: still celebrate the transition
    }
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#007AFF", "#34C759", "#FF9500", "#5856D6"],
      disableForReducedMotion: true,
    });
  }, [allDone, protocolCategory]);

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
    <PageTransition className="min-h-screen bg-canvas pb-32">
      <PageHeader
        title="Protocol"
        className="pb-6"
        trailing={
          <>
            <AnimatePresence initial={false}>
              {isOrderCustomized && (
                <motion.button
                  initial={ICON_ENTER}
                  animate={ICON_VISIBLE}
                  exit={ICON_ENTER}
                  transition={ICON_SPRING}
                  whileTap={TAP}
                  onClick={() => { haptic.trigger("medium"); resetTaskOrder(); }}
                  className="w-10 h-10 rounded-full bg-surface flex items-center justify-center shadow-card"
                  aria-label="Reset Order"
                >
                  <RotateCcw size={20} className="text-accent" />
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button
              whileTap={TAP}
              onClick={() => { haptic.trigger("light"); setTasksReminderSettings(true); }}
              className="w-10 h-10 rounded-full bg-surface flex items-center justify-center shadow-card"
              aria-label="Reminder Settings"
            >
              <Bell size={20} className="text-accent" />
            </motion.button>
            <motion.button
              whileTap={TAP}
              onClick={() => { haptic.trigger("medium"); setAddTaskSheetVisible(true); }}
              className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-float"
              aria-label="Add Task"
            >
              <Plus size={22} strokeWidth={2.5} className="text-white" />
            </motion.button>
          </>
        }
      />

      {/* Category Pill Selector */}
      <CategoryPillSelector
        categories={protocolCategories}
        activeCategory={protocolCategory}
        onCategoryChange={(id) => { haptic.trigger("selection"); switchCategory(id); }}
      />

      {/* Phase Sections */}
      <AnimatePresence initial={false}>
        <motion.div
          key={protocolCategory}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0 } }}
          transition={FADE}
        >
         <AnimatePresence initial={false}>
          <motion.div
            key={hasTasks ? "tasks" : "empty"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            transition={FADE}
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
                  onToggleTask={(phaseId, taskId) => { haptic.trigger("light"); toggleTask(phaseId, taskId); }}
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
