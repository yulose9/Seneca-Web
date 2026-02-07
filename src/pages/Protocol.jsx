import confetti from "canvas-confetti";
import clsx from "clsx";
import {
  AnimatePresence,
  motion,
  Reorder,
  useDragControls,
} from "framer-motion";
import { Check, ChevronRight, Plus, RotateCcw } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import AddTaskSheet from "../components/AddTaskSheet";
import HabitDetailSheet from "../components/HabitDetailSheet";
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
      style={{ userSelect: "none", WebkitUserSelect: "none", touchAction: "pan-y" }}
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
          !isUnlocked && "opacity-50 grayscale pointer-events-none",
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
  } = useProtocol();

  const [expandedPhases, setExpandedPhases] = useState(["morningIgnition"]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [addTaskSheetVisible, setAddTaskSheetVisible] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);

  // Track previous completion state to trigger auto-advance
  const prevCompletedRef = useRef({});

  useEffect(() => {
    phaseOrder.forEach((phaseId, index) => {
      const currentPhaseTasks = phaseTasks[phaseId];
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
    if (allPhasesComplete) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#007AFF", "#34C759", "#FF9500", "#5856D6"],
      });
    }
  }, [allPhasesComplete]);

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
              onClick={() => setAddTaskSheetVisible(true)}
              className="w-10 h-10 rounded-full bg-[#007AFF] flex items-center justify-center shadow-lg shadow-[#007AFF]/25"
            >
              <Plus size={22} strokeWidth={2.5} className="text-white" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Phase Sections */}
      <div>
        {phaseOrder.map((phaseId) => (
          <PhaseSection
            key={phaseId}
            phaseId={phaseId}
            phase={phases[phaseId]}
            tasks={phaseTasks[phaseId]}
            isExpanded={expandedPhases.includes(phaseId)}
            isUnlocked={isPhaseUnlocked(phaseId)}
            onToggleTask={toggleTask}
            onToggleExpand={handleToggleExpand}
            onCompletePhase={handleCompletePhase}
            onTaskPress={handleTaskPress}
            onReorder={reorderTasks}
            progress={getPhaseProgress(phaseId)}
          />
        ))}
      </div>

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
      />
    </PageTransition>
  );
}
