import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Trash2, X } from "lucide-react";
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

// iOS 18 System Colors
const SystemColors = {
  blue: "#007AFF",
  green: "#34C759",
  orange: "#FF9500",
  purple: "#AF52DE",
  red: "#FF3B30",
  teal: "#00C7BE",
  indigo: "#5856D6",
  pink: "#FF2D55",
  cyan: "#32ADE6",
};

// Habit Information
const HABIT_INFO = {
  Pray: {
    description:
      "Start your day with gratitude. Thank the Lord God for the gift of life, for the miracle of waking up to a new morning. Center your heart and surrender your worries before the world rushes in.",
    color: SystemColors.blue,
    quote: "This is the day the Lord has made.",
  },
  "Fix Bed": {
    description:
      "Order begins here. Restore order to your sanctuary—tidy up not just your bed (and Kuya's!), but your parents' bed too. A clean bedroom sets the standard for a disciplined, clutter-free mind.",
    color: SystemColors.purple,
    items: [
      { label: "My Bed", icon: "🛏️" },
      { label: "Parents Bed", icon: "✨" },
      { label: "Tidy Room", icon: "🧹" },
    ],
  },
  Coffee: {
    description:
      "Ignite your mind. Choose non-sugar caffeine (black coffee or tea) to jumpstart your system without the glucose crash. Pure focus, zero distractions.",
    color: SystemColors.orange,
  },
  Breakfast: {
    description:
      "Listen to your body. If you're fasting for weight loss, skip this with pride—it's a victory. If you need fuel, eat mindfully.",
    color: SystemColors.green,
    type: "choice",
    choices: [
      { label: "I Fasted ⚡", value: "fasted", color: SystemColors.green },
      { label: "I Ate 🍳", value: "ate", color: SystemColors.teal },
    ],
  },
  "Morning Brush": {
    description:
      "Master the basics. Brush with intent—this isn't just a chore, it's respect for yourself and everyone you meet. Dental hygiene is non-negotiable. Don't forget the oral wash.",
    color: SystemColors.cyan,
    routine: [
      { label: "Morning", icon: "☀️" },
      { label: "Lunch", icon: "🍽️" },
      { label: "Sleep", icon: "🌙" },
    ],
  },
  Shower: {
    description:
      "Do this ASAP. Wash away the sleep and lethargy immediately. Combine this with your skincare routine to step out fresh, sharp, and ready for war.",
    color: SystemColors.blue,
    stack: [
      { label: "Cleanse", icon: "🧼" },
      { label: "Moisturize", icon: "💧" },
      { label: "SPF", icon: "☀️" },
      { label: "Vitamins", icon: "💊" },
    ],
  },
  "Reflect on your day": {
    description:
      "Who are you becoming? Journal your wins to celebrate, your losses to learn, and your morality to stay grounded. Build your character daily.",
    color: SystemColors.indigo,
    action: "journal",
    tags: ["Wins", "Losses", "Morality", "Improvement"],
  },
  "Read News": {
    description:
      "Filter the noise. Stick to high-signal sources. Knowledge is power, but only if it's true and relevant.",
    color: "#64748B",
    sources: [
      { label: "Telegram", icon: "✈️" },
      { label: "Google News", icon: "🌐" },
      { label: "YouTube", icon: "▶️" },
    ],
  },
  "Read Book": {
    description:
      "Feed your mind. Read 5-10 pages daily. Don't just read—internalize.",
    color: SystemColors.purple,
    goals: ["5-10 Pages", "Internalize"],
    topics: ["Stoicism", "Wealth", "Tech", "AI"],
  },
  "Learn Stuff": {
    description:
      "Expertise is built hour by hour. Dedicate 2-3 hours to your Workforce Development Plan. Master RHEL, Cloud, and Engineering.",
    color: SystemColors.pink,
    time: "2-3 HOURS",
    certifications: [
      {
        label: "Terraform Assoc.",
        status: "done",
        date: "Mar 3, 2025",
        icon: "☁️",
      },
      {
        label: "Red Hat CSA",
        status: "progress",
        date: "Oct 24, 2025",
        icon: "🎩",
      },
      {
        label: "OpenShift Admin",
        status: "locked",
        date: "Sep 17, 2025",
        icon: "🚢",
      },
      {
        label: "AWS DevOps Pro",
        status: "locked",
        date: "2026 Q3",
        icon: "🏗️",
      },
      { label: "GitHub Found.", status: "locked", date: "2026 Q3", icon: "🐙" },
    ],
  },
  Workout: {
    description:
      "Movement is medicine. Movement is mandatory. Use your tools to track your progress.",
    color: SystemColors.red,
    apps: [
      { label: "Strong", icon: "🏋️" },
      { label: "Strava", icon: "🏃" },
      { label: "Watch", icon: "⌚" },
    ],
  },
  "Eat Lunch": {
    description:
      "Midday checkpoint. If you're riding the fasting wave, keep surfing. If you need to break fast, prioritize protein and clean fuel. No slump allowed.",
    color: SystemColors.green,
    type: "choice",
    choices: [
      { label: "Power Fast ⚡", value: "fasted", color: SystemColors.green },
      { label: "Clean Fuel 🥗", value: "ate", color: SystemColors.teal },
    ],
  },
  "Toothbrush Lunch": {
    description:
      "Reset your palate. A mid-day brush prevents the afternoon decline and keeps your standards elite. Hygiene doesn't take a break.",
    color: SystemColors.teal,
    routine: [
      { label: "Morning", icon: "☀️" },
      { label: "Lunch", icon: "🍽️" },
      { label: "Sleep", icon: "🌙" },
    ],
  },
  Clean: {
    description:
      "Entropy is the enemy. Reset your physical and digital workspace. Clear your desktop files, organize your shoes, sweep the dust. A clear space is a sharp mind.",
    color: SystemColors.cyan,
    items: [
      { label: "Digital Desktop", icon: "💻" },
      { label: "Office Space", icon: "🪑" },
      { label: "Shoes/Gear", icon: "👟" },
      { label: "Dust/Sweep", icon: "🧹" },
    ],
  },
  "Brush Before Sleep": {
    description:
      "The final seal. Close the day with discipline. A clean mouth ensures a peaceful sleep and a dignified wake-up.",
    color: SystemColors.purple,
    routine: [
      { label: "Morning", icon: "☀️" },
      { label: "Lunch", icon: "🍽️" },
      { label: "Sleep", icon: "🌙" },
    ],
  },
  "Skin Care Evening": {
    description:
      "Repair mode activated. Your skin heals while you dream. Don't skip this—this is an investment in your future face. Layer it right.",
    color: SystemColors.pink,
    stack: [
      { label: "Double Cleanse", icon: "🧼" },
      { label: "Toner", icon: "💧" },
      { label: "Serum/Active", icon: "✨" },
      { label: "Moisturizer", icon: "🧴" },
    ],
  },
  Sleep: {
    description:
      "System Shutdown. Sleep is not a luxury, it is a biological necessity for elite performance. Lights out. Phone away.",
    color: SystemColors.indigo,
    time: "BEFORE 9:00 PM",
    tags: ["Recovery", "Growth", "Deep Rest"],
  },
};

// Helper to get past dates
const getPastDates = (days) => {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
};

// Streak Calendar Component - Habit Pixel / GitHub Style Heatmap
const StreakCalendar = ({ habit, color, history = {}, onToggle }) => {
  const calendarData = useMemo(() => {
    const today = new Date();
    const weeksToShow = 20; // Reduced slighty for mobile width fit, but scrollable is fine
    const daysToGenerate = weeksToShow * 7;

    // Calculate start date (going back N weeks)
    // Ensure we end on "Today" or end of current week?
    // To align grid, easier if we just generate N full weeks ending with *this* week
    // Find the Monday of the current week (or future Sunday)
    // Let's settle on: Last column is "Current Week"

    const currentDay = today.getDay(); // 0=Sun, 1=Mon...
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1; // Mon=0, Sun=6

    // Target End Date = Today + (6 - daysSinceMonday) to fill the week? Or just Today?
    // GitHub fills the week. Let's fill the week for visual neatness.
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - daysSinceMonday));

    const dates = [];
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(endOfWeek);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }

    // Generate Month Labels
    // We want to place labels roughly where the month changes
    const monthLabels = [];
    let lastMonth = -1;
    dates.forEach((dateStr, index) => {
      // Only check first day of each week (every 7th day) to place label above column
      if (index % 7 === 0) {
        const date = new Date(dateStr);
        const month = date.getMonth();
        if (month !== lastMonth) {
          monthLabels.push({
            index: Math.floor(index / 7),
            label: date.toLocaleString("default", { month: "short" }),
          });
          lastMonth = month;
        }
      }
    });

    return { dates, monthLabels };
  }, []);

  const { dates, monthLabels } = calendarData;
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

  // Calculate Streak Stats
  const stats = useMemo(() => {
    const sortedDates = Object.keys(history)
      .filter((d) => history[d])
      .sort()
      .reverse();
    let currentStreak = 0;
    const todayStr = new Date().toISOString().split("T")[0];

    // Check if today is done, if not, check yesterday to keep streak alive
    const todayIndex = sortedDates.indexOf(todayStr);
    let checkDate = new Date();

    // If today is not done, check if yesterday was done to allow "continuation" before failure
    // Re-implementing simple streak logic
    let streak = 0;
    let d = new Date();
    // If today not done, check if yesterday was done (allow missed entry for today to not break streak yet)
    if (!history[d.toISOString().split("T")[0]]) {
      d.setDate(d.getDate() - 1);
    }

    while (true) {
      const dateStr = d.toISOString().split("T")[0];
      if (history[dateStr]) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      total: Object.values(history).filter(Boolean).length,
      currentStreak: streak,
    };
  }, [history]);

  // Dimensions for the grid
  const BOX_SIZE = 34; // Large, tappable size
  const GAP = 6;
  const COL_WIDTH = BOX_SIZE + GAP;

  // Ref for scrolling to end
  const scrollContainerRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft =
        scrollContainerRef.current.scrollWidth;
    }
  }, [dates]);

  return (
    <div className="mb-8">
      {/* Header / Stats */}
      <div className="flex items-center justify-between mb-5 px-1">
        <p className="text-[17px] font-bold text-black tracking-tight">
          History
        </p>
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-[11px] font-bold text-[rgba(60,60,67,0.4)] uppercase tracking-wide">
              Streak
            </p>
            <p
              className="text-[20px] font-bold leading-none tabular-nums"
              style={{ color }}
            >
              {stats.currentStreak}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-[rgba(60,60,67,0.4)] uppercase tracking-wide">
              Total
            </p>
            <p
              className="text-[20px] font-bold leading-none tabular-nums"
              style={{ color }}
            >
              {stats.total}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable Heatmap Container */}
      <div className="bg-white rounded-[24px] p-5 border border-[rgba(60,60,67,0.08)] shadow-sm relative overflow-hidden">
        {/* Month Labels Sticky Header? No, scrolling. */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="flex-none relative">
            {/* Month Labels */}
            <div className="flex h-7 w-full relative mb-2">
              {monthLabels.map((lbl, i) => (
                <span
                  key={i}
                  className="absolute text-[13px] font-bold text-[rgba(60,60,67,0.5)] uppercase tracking-wide"
                  style={{ left: `${lbl.index * COL_WIDTH + 20}px` }} // +20 for left axis offset
                >
                  {lbl.label}
                </span>
              ))}
            </div>

            <div className="flex gap-4">
              {/* Day Labels (Sticky Left Axis) */}
              <div className="grid grid-rows-7 gap-[6px] h-fit pt-[1px] sticky left-0 bg-white z-10 pr-2">
                {weekDays.map((d, i) => (
                  <div
                    key={i}
                    className="h-[34px] flex items-center justify-center"
                  >
                    <span className="text-[11px] font-bold text-[rgba(60,60,67,0.3)]">
                      {d}
                    </span>
                  </div>
                ))}
              </div>

              {/* The Grid */}
              <div
                className="grid grid-rows-7 grid-flow-col"
                style={{ gap: `${GAP}px` }}
              >
                {dates.map((date) => {
                  const isDone = !!history[date];
                  const isToday =
                    date === new Date().toISOString().split("T")[0];
                  const dateObj = new Date(date);
                  const isFuture = dateObj > new Date();
                  const dayNum = dateObj.getDate();

                  return (
                    <motion.div
                      key={date}
                      onClick={() => !isFuture && onToggle(date)}
                      whileTap={{ scale: 0.85 }}
                      className={clsx(
                        "rounded-[10px] cursor-pointer flex items-center justify-center transition-all duration-300 relative overflow-hidden",
                        isFuture ? "opacity-0 pointer-events-none" : ""
                      )}
                      style={{
                        width: BOX_SIZE,
                        height: BOX_SIZE,
                        backgroundColor: isDone
                          ? color
                          : "rgba(120,120,128,0.06)",
                        border:
                          isToday && !isDone ? `2px solid ${color}` : "none",
                        boxShadow: isDone ? `0 2px 8px ${color}40` : "none",
                      }}
                    >
                      {/* Date Number */}
                      <span
                        className={clsx(
                          "text-[13px] font-bold",
                          isDone ? "text-white" : "text-[rgba(60,60,67,0.3)]",
                          isToday && !isDone ? "text-[color:var(--color)]" : ""
                        )}
                        style={{
                          color: isToday && !isDone ? color : undefined,
                        }}
                      >
                        {dayNum}
                      </span>

                      {/* Optional: 'Check' icon if done? Or just simplify with number. Number is clean. */}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Fade effect on right to hint scroll, only visible if content overflows? Always nice. */}
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none" />
        <div className="absolute left-[30px] top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none" />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 px-2">
        <p className="text-[13px] font-medium text-[rgba(60,60,67,0.5)]">
          Tap any date to edit history
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[rgba(120,120,128,0.1)]" />
            <span className="text-[12px] text-[rgba(60,60,67,0.5)] font-medium">
              Missed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: color,
                boxShadow: `0 2px 8px ${color}40`,
              }}
            />
            <span className="text-[12px] text-[rgba(60,60,67,0.5)] font-medium">
              Done
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function HabitDetailSheet({
  visible,
  onClose,
  habit,
  onToggleHistory,
  getHistory,
  onDeleteCustomTask,
}) {
  const navigate = useNavigate();

  if (!habit) return null;

  // Check if this is a custom task
  const isCustomTask = habit.isCustom === true;

  // Get habit info - for custom tasks, use their own data
  const habitInfo = isCustomTask
    ? {
        description: habit.description || "Build this habit consistently.",
        color: SystemColors.blue,
        subtitle: habit.subtitle || null,
      }
    : HABIT_INFO[habit.title] || {
        description: "Build this habit consistently.",
        color: SystemColors.blue,
      };

  const handleDeleteTask = () => {
    if (onDeleteCustomTask && isCustomTask) {
      onDeleteCustomTask(habit.phaseId, habit.id);
      onClose();
    }
  };

  const history = getHistory ? getHistory(habit.phaseId, habit.id) : {};
  const today = new Date().toISOString().split("T")[0];
  const isTodayDone = !!history[today];

  const handleActionButton = () => {
    if (habit && onToggleHistory) {
      onToggleHistory(habit.phaseId, habit.id, today);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="ios-sheet-backdrop"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="ios-sheet"
          >
            {/* Handle */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-pointer"
              onClick={onClose}
            >
              <div className="ios-sheet-handle w-12 h-1.5" />
            </div>

            <div className="ios-sheet-content max-h-[85vh] overflow-y-auto px-6 pb-12 pt-2">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h2 className="text-[32px] font-bold text-black tracking-tight leading-tight">
                      {habit.title}
                    </h2>
                    {isCustomTask && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleDeleteTask}
                        className="w-10 h-10 rounded-full bg-[#FF3B30]/10 flex items-center justify-center ml-3"
                      >
                        <Trash2 size={18} className="text-[#FF3B30]" />
                      </motion.button>
                    )}
                  </div>
                  {isCustomTask && habitInfo.subtitle && (
                    <p className="text-[16px] font-medium text-[rgba(60,60,67,0.6)] mt-1.5">
                      {habitInfo.subtitle}
                    </p>
                  )}
                  {habitInfo.quote && (
                    <p
                      className="text-[16px] italic font-medium mt-1.5"
                      style={{ color: habitInfo.color }}
                    >
                      "{habitInfo.quote}"
                    </p>
                  )}
                </div>
              </div>

              {/* Custom Task Badge */}
              {isCustomTask && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1.5 bg-[#007AFF]/10 text-[#007AFF] text-[12px] font-bold rounded-full uppercase tracking-wide">
                    Custom Task
                  </span>
                </div>
              )}

              {/* Description */}
              <p className="text-[18px] leading-relaxed text-[rgba(60,60,67,0.85)] mb-8">
                {habitInfo.description}
              </p>

              {/* Items / Pills */}
              {habitInfo.items && (
                <div className="flex flex-wrap gap-2.5 mb-8">
                  {habitInfo.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center bg-[rgba(120,120,128,0.08)] px-4 py-2.5 rounded-2xl"
                    >
                      <span className="mr-2 text-lg">{item.icon}</span>
                      <span className="text-[15px] font-semibold text-black">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Routine */}
              {habitInfo.routine && (
                <div className="mb-8">
                  <p className="text-[12px] font-bold text-[rgba(60,60,67,0.6)] uppercase tracking-wider mb-4">
                    Daily Routine
                  </p>
                  <div className="flex justify-around">
                    {habitInfo.routine.map((step, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center mb-2.5"
                          style={{ backgroundColor: `${habitInfo.color}15` }}
                        >
                          <span className="text-2xl">{step.icon}</span>
                        </div>
                        <span className="text-[14px] font-medium text-[rgba(60,60,67,0.6)]">
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stack */}
              {habitInfo.stack && (
                <div className="mb-8">
                  <p className="text-[12px] font-bold text-[rgba(60,60,67,0.6)] uppercase tracking-wider mb-4">
                    Essentials Stack
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {habitInfo.stack.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center bg-[rgba(120,120,128,0.08)] p-3.5 rounded-2xl"
                      >
                        <span className="text-2xl mr-3.5">{item.icon}</span>
                        <span className="text-[15px] font-semibold text-black">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Goals / Tags */}
              {(habitInfo.goals || habitInfo.tags) && (
                <div className="flex flex-wrap gap-2.5 mb-8">
                  {(habitInfo.goals || habitInfo.tags).map((tag, i) => (
                    <div
                      key={i}
                      className="px-3.5 py-2 rounded-full"
                      style={{ backgroundColor: `${habitInfo.color}15` }}
                    >
                      <span
                        className="text-[14px] font-semibold"
                        style={{ color: habitInfo.color }}
                      >
                        #{tag}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Certifications */}
              {habitInfo.certifications && (
                <div className="mb-8">
                  <p className="text-[12px] font-bold text-[rgba(60,60,67,0.6)] uppercase tracking-wider mb-4">
                    Certification Roadmap
                  </p>
                  <div className="bg-[rgba(120,120,128,0.04)] rounded-2xl overflow-hidden">
                    {habitInfo.certifications.map((cert, i) => (
                      <div
                        key={i}
                        className={clsx(
                          "flex items-center p-4",
                          i !== habitInfo.certifications.length - 1 &&
                            "border-b border-[rgba(60,60,67,0.08)]"
                        )}
                      >
                        <div
                          className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center mr-4",
                            cert.status === "done"
                              ? "bg-[#D1FAE5]"
                              : cert.status === "progress"
                              ? "bg-[#FEF3C7]"
                              : "bg-[#F3F4F6]"
                          )}
                        >
                          <span className="text-lg">
                            {cert.status === "done"
                              ? "✅"
                              : cert.status === "progress"
                              ? "⏳"
                              : "🔒"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-[16px] font-semibold text-black">
                            {cert.label}
                          </p>
                          <p className="text-[13px] text-[rgba(60,60,67,0.6)] mt-0.5">
                            {cert.date}
                          </p>
                        </div>
                        <span className="text-2xl">{cert.icon}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Journal Action */}
              {habitInfo.action === "journal" && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onClose();
                    navigate("/journal");
                  }}
                  className="w-full py-4 rounded-2xl border-2 border-dashed mb-8 font-bold text-[16px] flex items-center justify-center"
                  style={{
                    borderColor: habitInfo.color,
                    color: habitInfo.color,
                  }}
                >
                  Go to Journal 📖
                </motion.button>
              )}

              {/* Divider */}
              <div className="h-px bg-[rgba(60,60,67,0.12)] mb-8" />

              {/* Streak Calendar */}
              <StreakCalendar
                habit={habit}
                color={habitInfo.color}
                history={history}
                onToggle={(date) =>
                  onToggleHistory(habit.phaseId, habit.id, date)
                }
              />

              {/* Action Button */}
              <div className="mt-8 pb-8">
                {!isTodayDone && habitInfo.type === "choice" ? (
                  <div className="flex gap-4">
                    {habitInfo.choices.map((choice, index) => (
                      <motion.button
                        key={index}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleActionButton}
                        className="flex-1 h-[56px] rounded-2xl border-2 flex items-center justify-center text-[18px] font-bold"
                        style={{
                          backgroundColor: `${choice.color}12`,
                          borderColor: choice.color,
                          color: choice.color,
                        }}
                      >
                        {choice.label}
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleActionButton}
                    className={clsx(
                      "w-full h-[56px] rounded-2xl flex items-center justify-center text-[18px] font-bold transition-all duration-200",
                      isTodayDone
                        ? "text-white shadow-xl bg-opacity-100"
                        : "bg-[rgba(120,120,128,0.12)] text-black"
                    )}
                    style={{
                      backgroundColor: isTodayDone
                        ? habitInfo.color
                        : undefined,
                      boxShadow: isTodayDone
                        ? `0 6px 20px ${habitInfo.color}50`
                        : undefined,
                    }}
                  >
                    {isTodayDone ? (
                      <>
                        <Check size={22} strokeWidth={3} className="mr-2.5" />
                        Completed
                      </>
                    ) : (
                      "Complete Task"
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
