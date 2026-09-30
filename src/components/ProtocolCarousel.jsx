import { AnimatePresence, motion } from "framer-motion";
import { useWebHaptics } from "web-haptics/react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { usePersonalGoals } from "../context/PersonalGoalsContext";
import { useProtocol } from "../context/ProtocolContext";
import {
  EASE_OUT,
  FADE,
  FADE_EXIT,
  LAYOUT_SPRING,
  PROGRESS_TRANSITION,
  TAP,
  TAP_CARD,
  TAP_TRANSITION,
} from "../constants/motion";
import { useStudyGoal } from "../context/StudyGoalContext";
import { getPhDateKey } from "../utils/timeUtils";
import LiquidGlass from "./LiquidGlass";

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

// Swipe threshold in pixels â€” a quick flick past SWIPE_VELOCITY also counts
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 400;

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
  const haptic = useWebHaptics();

  // Feedback animation state: { cardId, type: "yes"|"no" } or null
  const [feedback, setFeedback] = useState(null);
  const feedbackTimer = useRef(null);

  // Clear timer on unmount
  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );

  // Context hooks
  const {
    completedCount,
    totalCount,
    progress,
    getCurrentStatus,
    allPhasesComplete,
    markLearnStuffDone,
    markWorkoutDone,
  } = useProtocol();

  const { activeStudyGoal, getStudiedToday, markStudiedToday, getStudyStreak } =
    useStudyGoal();

  const { goalHistory, getGoalStreak, toggleGoalDate } = usePersonalGoals();

  // Manila day — history keys are Manila keys (device-local drifted abroad)
  const today = getPhDateKey();
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

  // Side effects (haptics) stay out of the state updater so they fire exactly once,
  // and paging starts from the clamped index so it never skips after a card is removed.
  const paginate = useCallback(
    (newDirection) => {
      const next = safeIndex + newDirection;
      if (next < 0 || next >= cards.length) return;
      haptic.trigger('selection');
      setPage([next, newDirection]);
    },
    [safeIndex, cards.length, haptic],
  );

  const goTo = useCallback((idx) => {
    if (idx === safeIndex) return;
    haptic.trigger('selection');
    setPage([idx, idx > safeIndex ? 1 : -1]);
  }, [safeIndex, haptic]);

  // Trigger feedback animation, then fire the action after a brief delay
  const triggerFeedback = useCallback((cardId, type, action) => {
    haptic.trigger(type === 'yes' ? 'success' : 'light');
    setFeedback({ cardId, type });
    // Fire the actual state-changing action after a short animation
    feedbackTimer.current = setTimeout(() => {
      action();
      // The card will auto-remove from `cards` on next render
      setFeedback(null);
    }, 1400);
  }, [haptic]);

  // Nothing to show — all done for the day!
  if (cards.length === 0 && !feedback) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className="rounded-2xl p-5 bg-positive/8 border border-positive/15"
        style={{
          backgroundColor: "rgba(52, 199, 89, 0.08)",
          borderColor: "rgba(52, 199, 89, 0.15)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-positive/10 flex items-center justify-center">
            <span className="text-title-2">🏆</span>
          </div>
          <div>
            <h4 className="text-body font-bold text-positive">
              All Caught Up
            </h4>
            <p className="text-subhead text-ink-2">
              Everything checked in for today
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const currentCard = cards[safeIndex];
  const showingFeedback =
    feedback && currentCard && feedback.cardId === currentCard.id;
  const feedbackData = showingFeedback
    ? FEEDBACK[feedback.cardId]?.[feedback.type]
    : null;

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
    // Notify ProtocolContext (clears the Protocol task visually but sets actual history bool for streaks)
    markWorkoutDone(value);

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
      <LiquidGlass as={motion.div} className="overflow-hidden rounded-2xl shadow-card">
        {/* Header with dots + arrows */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          {/* Left arrow */}
          <motion.button
            whileTap={TAP}
            transition={TAP_TRANSITION}
            onClick={() => paginate(-1)}
            aria-label="Previous card"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-opacity duration-150 ${
              safeIndex === 0
                ? "opacity-20 pointer-events-none"
                : "opacity-60 active:opacity-100"
            }`}
          >
            <ChevronLeft size={18} className="text-ink-2" />
          </motion.button>

          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {cards.map((card, i) => (
              <motion.button
                key={card.id}
                onClick={() => goTo(i)}
                aria-label={`Show ${card.label}`}
                aria-current={i === safeIndex ? "true" : undefined}
                className="relative w-2 h-2 rounded-full after:absolute after:-inset-2 after:content-['']"
                initial={false}
                animate={{
                  backgroundColor:
                    i === safeIndex ? "#007AFF" : "rgba(120,120,128,0.2)",
                  scale: i === safeIndex ? 1.3 : 1,
                }}
                transition={FADE}
              />
            ))}
          </div>

          {/* Right arrow */}
          <motion.button
            whileTap={TAP}
            transition={TAP_TRANSITION}
            onClick={() => paginate(1)}
            aria-label="Next card"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-opacity duration-150 ${
              safeIndex === cards.length - 1
                ? "opacity-20 pointer-events-none"
                : "opacity-60 active:opacity-100"
            }`}
          >
            <ChevronRight size={18} className="text-ink-2" />
          </motion.button>
        </div>

        {/* Swipeable content area */}
        <div className="relative">
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            <motion.div
              key={currentCard.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={LAYOUT_SPRING}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                const { offset, velocity } = info;
                if (offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY) paginate(1);
                else if (offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY) paginate(-1);
              }}
              className="px-5 pb-5"
            >
              {/* Protocol Card */}
              {currentCard.id === "protocol" && (
                <motion.div
                  onClick={() => navigate("/protocol")}
                  whileTap={TAP_CARD}
                  className="cursor-pointer"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-footnote font-semibold text-caution">
                      Protocol
                    </span>
                    <ChevronRight size={16} className="text-ink-3" />
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <h4 className="text-body font-semibold text-ink">
                          {getCurrentStatus().phase}
                        </h4>
                        <p className="text-subhead text-ink-2 mt-0.5 tabular-nums">
                          {completedCount} of {totalCount} tasks
                        </p>
                      </div>
                      <span className="text-subhead font-bold text-caution tabular-nums">
                        {progress}%
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 bg-fill rounded-full overflow-hidden">
                      <motion.div
                        className="h-full w-full rounded-full"
                        style={{ backgroundColor: "var(--color-caution)", transformOrigin: "left" }}
                        initial={false}
                        animate={{ scaleX: progress / 100 }}
                        transition={PROGRESS_TRANSITION}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Study Goal Card */}
              {currentCard.id === "study" && (
                <div>
                  <div
                    className="flex justify-between items-center mb-1 cursor-pointer active:bg-fill"
                    onClick={() => navigate("/growth")}
                  >
                    <span className="text-footnote font-semibold text-accent">
                      Study Goal
                    </span>
                    <ChevronRight size={16} className="text-ink-3" />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                        <span className="text-title-2">📚</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-semibold text-ink leading-tight truncate">
                          {activeStudyGoal?.name}
                        </p>
                        <p className="text-subhead text-ink-2 mt-0.5">
                          {activeStudyGoal?.target}
                        </p>
                      </div>
                    </div>
                    {getStudyStreak() > 0 && (
                      <div className="text-right ml-3">
                        <p className="text-title-3 font-bold text-accent tabular-nums">
                          {getStudyStreak()}
                        </p>
                        <p className="text-caption-2 text-ink-2">
                          day streak
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Quick action buttons */}
                  <div className="mt-4 pt-3 border-t border-separator">
                    <p className="text-subhead font-medium text-center text-ink mb-3">
                      Did you study today? 📖
                    </p>
                    <div className="flex gap-3">
                      <motion.button
                        whileTap={TAP}
                        transition={TAP_TRANSITION}
                        onClick={() =>
                          triggerFeedback("study", "yes", () =>
                            markStudiedToday(true, markLearnStuffDone),
                          )
                        }
                        disabled={!!feedback}
                        className="flex-1 py-3 rounded-xl font-semibold text-subhead flex items-center justify-center gap-2 bg-positive/10 text-positive"
                      >
                        <Check size={18} strokeWidth={3} /> Yes
                      </motion.button>
                      <motion.button
                        whileTap={TAP}
                        transition={TAP_TRANSITION}
                        onClick={() =>
                          triggerFeedback("study", "no", () =>
                            markStudiedToday(false),
                          )
                        }
                        disabled={!!feedback}
                        className="flex-1 py-3 rounded-xl font-semibold text-subhead flex items-center justify-center gap-2 bg-negative/10 text-negative"
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
                    className="flex justify-between items-center mb-1 cursor-pointer active:bg-fill"
                    onClick={() => navigate("/growth")}
                  >
                    <span className="text-footnote font-semibold text-[#8B5CF6]">
                      No Porn
                    </span>
                    <ChevronRight size={16} className="text-ink-3" />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/10 flex items-center justify-center">
                        <span className="text-title-2">🚫</span>
                      </div>
                      <div>
                        <p className="text-body font-semibold text-ink leading-tight">
                          Stay Clean Today
                        </p>
                        <p className="text-subhead text-ink-2 mt-0.5">
                          {noPornStreak > 0
                            ? `${noPornStreak} day streak 🔥`
                            : "Start your streak today"}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Quick action buttons */}
                  <div className="mt-4 pt-3 border-t border-separator">
                    <p className="text-subhead font-medium text-center text-ink mb-3">
                      Did you stay clean today? 💪
                    </p>
                    <div className="flex gap-3">
                      <motion.button
                        whileTap={TAP}
                        transition={TAP_TRANSITION}
                        onClick={() =>
                          triggerFeedback("noporn", "yes", () =>
                            handleNoPornCheck(true),
                          )
                        }
                        disabled={!!feedback}
                        className="flex-1 py-3 rounded-xl font-semibold text-subhead flex items-center justify-center gap-2 bg-positive/10 text-positive"
                      >
                        <Check size={18} strokeWidth={3} /> Yes
                      </motion.button>
                      <motion.button
                        whileTap={TAP}
                        transition={TAP_TRANSITION}
                        onClick={() =>
                          triggerFeedback("noporn", "no", () =>
                            handleNoPornCheck(false),
                          )
                        }
                        disabled={!!feedback}
                        className="flex-1 py-3 rounded-xl font-semibold text-subhead flex items-center justify-center gap-2 bg-negative/10 text-negative"
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
                    className="flex justify-between items-center mb-1 cursor-pointer active:bg-fill"
                    onClick={() => navigate("/growth")}
                  >
                    <span className="text-footnote font-semibold text-accent">
                      Exercise
                    </span>
                    <ChevronRight size={16} className="text-ink-3" />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                        <span className="text-title-2">🏋️</span>
                      </div>
                      <div>
                        <p className="text-body font-semibold text-ink leading-tight">
                          Workout
                        </p>
                        <p className="text-subhead text-ink-2 mt-0.5">
                          {exerciseStreak > 0
                            ? `${exerciseStreak} day streak 🔥`
                            : "Get moving today"}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Quick action buttons */}
                  <div className="mt-4 pt-3 border-t border-separator">
                    <p className="text-subhead font-medium text-center text-ink mb-3">
                      Did you work out today? 💪
                    </p>
                    <div className="flex gap-3">
                      <motion.button
                        whileTap={TAP}
                        transition={TAP_TRANSITION}
                        onClick={() =>
                          triggerFeedback("exercise", "yes", () =>
                            handleExerciseCheck(true),
                          )
                        }
                        disabled={!!feedback}
                        className="flex-1 py-3 rounded-xl font-semibold text-subhead flex items-center justify-center gap-2 bg-positive/10 text-positive"
                      >
                        <Check size={18} strokeWidth={3} /> Yes
                      </motion.button>
                      <motion.button
                        whileTap={TAP}
                        transition={TAP_TRANSITION}
                        onClick={() =>
                          triggerFeedback("exercise", "no", () =>
                            handleExerciseCheck(false),
                          )
                        }
                        disabled={!!feedback}
                        className="flex-1 py-3 rounded-xl font-semibold text-subhead flex items-center justify-center gap-2 bg-negative/10 text-negative"
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
                    exit={{ opacity: 0, transition: FADE_EXIT }}
                    transition={FADE}
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
                        initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        transition={{
                          type: "spring",
                          duration: 0.4,
                          bounce: 0,
                          delay: 0.05,
                        }}
                      >
                        <span className="text-display block">
                          {feedbackData.icon}
                        </span>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.3, ease: EASE_OUT }}
                        className="text-center"
                      >
                        <p
                          className="text-body font-bold"
                          style={{
                            color:
                              feedback.type === "yes" ? "#34C759" : "#FF3B30",
                          }}
                        >
                          {feedbackData.text}
                        </p>
                        <p className="text-footnote text-ink-2 mt-0.5">
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
      </LiquidGlass>
    </div>
  );
}
