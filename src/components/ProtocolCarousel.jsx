import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePersonalGoals } from "../context/PersonalGoalsContext";
import { useProtocol } from "../context/ProtocolContext";
import { useStudyGoal } from "../context/StudyGoalContext";

// Feedback messages for yes/no actions per card type
const FEEDBACK = {
  study: {
    yes: { icon: "👍", text: "Great job!", sub: "Knowledge is power." },
    no: { icon: "📖", text: "It's okay.", sub: "Tomorrow's a new chance." },
  },
  noporn: {
    yes: { icon: "🛡️", text: "Warrior!", sub: "Stay disciplined." },
    no: { icon: "🌅", text: "Be honest.", sub: "Start fresh tomorrow." },
  },
  exercise: {
    yes: { icon: "💪", text: "Beast mode!", sub: "Keep crushing it." },
    no: { icon: "🚶", text: "Rest day.", sub: "Go again tomorrow." },
  },
};

// Helper to get today's date as YYYY-MM-DD in local tz
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Swipe threshold in pixels
const SWIPE_THRESHOLD = 50;

// Slide variants for animation
const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export default function ProtocolCarousel() {
  const navigate = useNavigate();
  const [[activeIndex, direction], setPage] = useState([0, 0]);

  // Feedback animation state: { cardId, type: "yes"|"no" } or null
  const [feedback, setFeedback] = useState(null);
  const feedbackTimer = useRef(null);

  // Clear timer on unmount
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);

  // Context hooks
  const {
    completedCount,
    totalCount,
    progress,
    getCurrentStatus,
    allPhasesComplete,
    markLearnStuffDone,
  } = useProtocol();

  const { activeStudyGoal, getStudiedToday, markStudiedToday, getStudyStreak } =
    useStudyGoal();

  const { goalHistory, getGoalStreak, toggleGoalDate } = usePersonalGoals();

  const today = getTodayStr();
  const studiedToday = getStudiedToday();
  const noPornToday = goalHistory?.noPorn?.[today];
  const exerciseToday = goalHistory?.exercise?.[today];
  const noPornStreak = getGoalStreak("noPorn");
  const exerciseStreak = getGoalStreak("exercise");

  // Build available cards — only show if NOT yet logged (yes OR no)
  const cards = useMemo(() => {
    const available = [];

    // 1 — Protocol (show if not all complete)
    if (!allPhasesComplete) {
      available.push({ id: "protocol", label: "Protocol" });
    }

    // 2 — Study Goal (show if goal exists and not logged today — neither true nor false)
    if (activeStudyGoal && studiedToday == null) {
      available.push({ id: "study", label: "Study Goal" });
    }

    // 3 — No Porn (show if not checked in today at all)
    if (noPornToday == null) {
      available.push({ id: "noporn", label: "No Porn" });
    }

    // 4 — Exercise (show if not checked in today at all)
    if (exerciseToday == null) {
      available.push({ id: "exercise", label: "Exercise" });
    }

    return available;
  }, [
    allPhasesComplete,
    activeStudyGoal,
    studiedToday,
    noPornToday,
    exerciseToday,
  ]);

  // Clamp active index when cards change
  const safeIndex = Math.min(activeIndex, Math.max(cards.length - 1, 0));

  const paginate = useCallback(
    (newDirection) => {
      setPage(([prev]) => {
        const next = prev + newDirection;
        if (next < 0 || next >= cards.length) return [prev, 0];
        return [next, newDirection];
      });
    },
    [cards.length],
  );

  const goTo = useCallback((idx) => {
    setPage(([prev]) => [idx, idx > prev ? 1 : -1]);
  }, []);

  // Trigger feedback animation, then fire the action after a brief delay
  const triggerFeedback = useCallback(
    (cardId, type, action) => {
      setFeedback({ cardId, type });
      // Fire the actual state-changing action after a short animation
      feedbackTimer.current = setTimeout(() => {
        action();
        // The card will auto-remove from `cards` on next render
        setFeedback(null);
      }, 1400);
    },
    [],
  );

  // Nothing to show — all done for the day!
  if (cards.length === 0 && !feedback) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 bg-[#34C759]/8 border border-[#34C759]/15"
        style={{
          backgroundColor: "rgba(52, 199, 89, 0.08)",
          borderColor: "rgba(52, 199, 89, 0.15)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#34C759]/10 flex items-center justify-center">
            <span className="text-2xl">🏆</span>
          </div>
          <div>
            <h4 className="text-[17px] font-bold text-[#34C759]">
              All Caught Up
            </h4>
            <p className="text-[14px] text-[rgba(60,60,67,0.6)]">
              Everything checked in for today
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const currentCard = cards[safeIndex];
  const showingFeedback = feedback && currentCard && feedback.cardId === currentCard.id;
  const feedbackData = showingFeedback ? FEEDBACK[feedback.cardId]?.[feedback.type] : null;

  // Mark no porn / exercise for today
  const handleNoPornCheck = (value) => {
    // toggleGoalDate cycles, but we want to set specifically
    // If current value is undefined/false and value is true, toggle to true
    // We'll use toggleGoalDate which cycles: undefined→true→false→undefined
    const current = goalHistory?.noPorn?.[today];
    if (value === true && current !== true) {
      toggleGoalDate("noPorn", today);
    } else if (value === false) {
      if (current === undefined) {
        // toggle twice: undefined→true→false
        toggleGoalDate("noPorn", today);
        setTimeout(() => toggleGoalDate("noPorn", today), 50);
      } else if (current === true) {
        toggleGoalDate("noPorn", today);
      }
    }
  };

  const handleExerciseCheck = (value) => {
    const current = goalHistory?.exercise?.[today];
    if (value === true && current !== true) {
      toggleGoalDate("exercise", today);
    } else if (value === false) {
      if (current === undefined) {
        toggleGoalDate("exercise", today);
        setTimeout(() => toggleGoalDate("exercise", today), 50);
      } else if (current === true) {
        toggleGoalDate("exercise", today);
      }
    }
  };

  return (
    <div className="relative">
      {/* Card Container */}
      <div className="overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-[rgba(0,0,0,0.04)] shadow-sm">
        {/* Header with dots + arrows */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          {/* Left arrow */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => paginate(-1)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-opacity ${
              safeIndex === 0
                ? "opacity-20 pointer-events-none"
                : "opacity-60 active:opacity-100"
            }`}
          >
            <ChevronLeft size={18} className="text-[rgba(60,60,67,0.6)]" />
          </motion.button>

          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {cards.map((card, i) => (
              <motion.button
                key={card.id}
                onClick={() => goTo(i)}
                className="w-2 h-2 rounded-full transition-all duration-300"
                animate={{
                  backgroundColor:
                    i === safeIndex ? "#007AFF" : "rgba(120,120,128,0.2)",
                  scale: i === safeIndex ? 1.3 : 1,
                }}
              />
            ))}
          </div>

          {/* Right arrow */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => paginate(1)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-opacity ${
              safeIndex === cards.length - 1
                ? "opacity-20 pointer-events-none"
                : "opacity-60 active:opacity-100"
            }`}
          >
            <ChevronRight size={18} className="text-[rgba(60,60,67,0.6)]" />
          </motion.button>
        </div>

        {/* Swipeable content area */}
        <div className="relative min-h-[140px]">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentCard.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.x < -SWIPE_THRESHOLD) paginate(1);
                else if (info.offset.x > SWIPE_THRESHOLD) paginate(-1);
              }}
              className="px-5 pb-5"
            >
              {/* Protocol Card */}
              {currentCard.id === "protocol" && (
                <div
                  onClick={() => navigate("/protocol")}
                  className="cursor-pointer"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[13px] font-semibold text-[#FF9500] uppercase tracking-wide">
                      Protocol
                    </span>
                    <ChevronRight size={16} className="text-[#C7C7CC]" />
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <h4 className="text-[17px] font-semibold text-black">
                          {getCurrentStatus().phase}
                        </h4>
                        <p className="text-[15px] text-[rgba(60,60,67,0.6)] mt-0.5">
                          {completedCount} of {totalCount} tasks
                        </p>
                      </div>
                      <span className="text-[15px] font-bold text-[#FF9500]">
                        {progress}%
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 bg-[rgba(120,120,128,0.12)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: "#FF9500" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Study Goal Card */}
              {currentCard.id === "study" && (
                <div>
                  <div
                    className="flex justify-between items-center mb-1"
                    onClick={() => navigate("/growth")}
                  >
                    <span className="text-[13px] font-semibold text-[#007AFF] uppercase tracking-wide">
                      Study Goal
                    </span>
                    <ChevronRight size={16} className="text-[#C7C7CC]" />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center">
                        <span className="text-2xl">📚</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[17px] font-semibold text-black leading-tight truncate">
                          {activeStudyGoal?.name}
                        </p>
                        <p className="text-[14px] text-[rgba(60,60,67,0.6)] mt-0.5">
                          {activeStudyGoal?.target}
                        </p>
                      </div>
                    </div>
                    {getStudyStreak() > 0 && (
                      <div className="text-right ml-3">
                        <p className="text-[20px] font-bold text-[#007AFF]">
                          {getStudyStreak()}
                        </p>
                        <p className="text-[11px] text-[rgba(60,60,67,0.6)]">
                          day streak
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Quick action buttons */}
                  <div className="mt-4 pt-3 border-t border-[rgba(60,60,67,0.08)]">
                    <p className="text-[14px] font-medium text-center text-[rgba(60,60,67,0.8)] mb-3">
                      Did you study today? 📖
                    </p>
                    <div className="flex gap-3">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          triggerFeedback("study", "yes", () => markStudiedToday(true, markLearnStuffDone))
                        }
                        disabled={!!feedback}
                        className="flex-1 py-3 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 bg-[#34C759]/10 text-[#34C759]"
                      >
                        <Check size={18} strokeWidth={3} /> Yes
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          triggerFeedback("study", "no", () => markStudiedToday(false))
                        }
                        disabled={!!feedback}
                        className="flex-1 py-3 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 bg-[#FF3B30]/10 text-[#FF3B30]"
                      >
                        <X size={18} strokeWidth={3} /> No
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}

              {/* No Porn Card */}
              {currentCard.id === "noporn" && (
                <div>
                  <div
                    className="flex justify-between items-center mb-1"
                    onClick={() => navigate("/growth")}
                  >
                    <span className="text-[13px] font-semibold text-[#8B5CF6] uppercase tracking-wide">
                      No Porn
                    </span>
                    <ChevronRight size={16} className="text-[#C7C7CC]" />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/10 flex items-center justify-center">
                        <span className="text-2xl">🚫</span>
                      </div>
                      <div>
                        <p className="text-[17px] font-semibold text-black leading-tight">
                          Stay Clean Today
                        </p>
                        <p className="text-[14px] text-[rgba(60,60,67,0.6)] mt-0.5">
                          {noPornStreak > 0
                            ? `${noPornStreak} day streak 🔥`
                            : "Start your streak today"}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Quick action buttons */}
                  <div className="mt-4 pt-3 border-t border-[rgba(60,60,67,0.08)]">
                    <p className="text-[14px] font-medium text-center text-[rgba(60,60,67,0.8)] mb-3">
                      Did you stay clean today? 💪
                    </p>
                    <div className="flex gap-3">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          triggerFeedback("noporn", "yes", () => handleNoPornCheck(true))
                        }
                        disabled={!!feedback}
                        className="flex-1 py-3 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 bg-[#34C759]/10 text-[#34C759]"
                      >
                        <Check size={18} strokeWidth={3} /> Yes
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          triggerFeedback("noporn", "no", () => handleNoPornCheck(false))
                        }
                        disabled={!!feedback}
                        className="flex-1 py-3 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 bg-[#FF3B30]/10 text-[#FF3B30]"
                      >
                        <X size={18} strokeWidth={3} /> No
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}

              {/* Exercise Card */}
              {currentCard.id === "exercise" && (
                <div>
                  <div
                    className="flex justify-between items-center mb-1"
                    onClick={() => navigate("/growth")}
                  >
                    <span className="text-[13px] font-semibold text-[#007AFF] uppercase tracking-wide">
                      Exercise
                    </span>
                    <ChevronRight size={16} className="text-[#C7C7CC]" />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center">
                        <span className="text-2xl">🏋️</span>
                      </div>
                      <div>
                        <p className="text-[17px] font-semibold text-black leading-tight">
                          Workout
                        </p>
                        <p className="text-[14px] text-[rgba(60,60,67,0.6)] mt-0.5">
                          {exerciseStreak > 0
                            ? `${exerciseStreak} day streak 🔥`
                            : "Get moving today"}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Quick action buttons */}
                  <div className="mt-4 pt-3 border-t border-[rgba(60,60,67,0.08)]">
                    <p className="text-[14px] font-medium text-center text-[rgba(60,60,67,0.8)] mb-3">
                      Did you work out today? 💪
                    </p>
                    <div className="flex gap-3">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          triggerFeedback("exercise", "yes", () => handleExerciseCheck(true))
                        }
                        disabled={!!feedback}
                        className="flex-1 py-3 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 bg-[#34C759]/10 text-[#34C759]"
                      >
                        <Check size={18} strokeWidth={3} /> Yes
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          triggerFeedback("exercise", "no", () => handleExerciseCheck(false))
                        }
                        disabled={!!feedback}
                        className="flex-1 py-3 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 bg-[#FF3B30]/10 text-[#FF3B30]"
                      >
                        <X size={18} strokeWidth={3} /> No
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Feedback Animation Overlay ── */}
              <AnimatePresence>
                {showingFeedback && feedbackData && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 flex items-center justify-center z-20 rounded-2xl"
                    style={{
                      backgroundColor:
                        feedback.type === "yes"
                          ? "rgba(52, 199, 89, 0.06)"
                          : "rgba(255, 59, 48, 0.06)",
                    }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <motion.div
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: "spring",
                          damping: 12,
                          stiffness: 200,
                          delay: 0.1,
                        }}
                      >
                        <span className="text-[52px] block">{feedbackData.icon}</span>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.3 }}
                        className="text-center"
                      >
                        <p
                          className="text-[18px] font-bold"
                          style={{
                            color:
                              feedback.type === "yes" ? "#34C759" : "#FF3B30",
                          }}
                        >
                          {feedbackData.text}
                        </p>
                        <p className="text-[13px] text-[rgba(60,60,67,0.5)] mt-0.5">
                          {feedbackData.sub}
                        </p>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
