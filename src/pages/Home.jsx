import { motion, Reorder } from "framer-motion";
import { Check, ChevronRight, GripVertical, Pencil, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExportDataButton from "../components/ExportDataButton";
import GsapText from "../components/GsapText";
import PageTransition from "../components/PageTransition";
import SystemCard from "../components/SystemCard";
import WeatherWidget from "../components/WeatherWidget";
import { useProtocol } from "../context/ProtocolContext";
import { useStudyGoal } from "../context/StudyGoalContext";

import HabitStreakGrid from "../components/HabitStreakGrid";

// LocalStorage key for card order
const CARD_ORDER_KEY = "home_card_order";

// Default card order
const DEFAULT_CARD_ORDER = ["focus", "protocol", "wealth", "journal"];

// iOS 18 Progress Ring Component
const ProgressRing = ({
  progress,
  size = 48,
  strokeWidth = 4,
  color = "#007AFF",
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg className="ios-progress-ring" width={size} height={size}>
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          className="ios-progress-ring-bg"
          strokeWidth={strokeWidth}
          style={{ stroke: "rgba(120, 120, 128, 0.12)" }}
        />
        {/* Progress ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          className="ios-progress-ring-fill"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          style={{ stroke: color }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>
        {progress}%
      </span>
    </div>
  );
};

// Format current date iOS style
const formatDate = () => {
  const now = new Date();
  const options = { weekday: "long", month: "short", day: "numeric" };
  return now.toLocaleDateString("en-US", options).toUpperCase();
};

// Get dynamic greeting based on time of day
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 4 && hour < 6) {
    return {
      title: "Early Riser",
      message:
        "The world is quiet. A perfect time to set your intentions for the day.",
    };
  } else if (hour >= 6 && hour < 12) {
    return {
      title: "Good Morning",
      message: "A fresh start awaits. What are your main goals for today?",
    };
  } else if (hour >= 12 && hour < 14) {
    return {
      title: "Midday Check-in",
      message:
        "Half the day is gone. How are you feeling? Time to refuel and reset.",
    };
  } else if (hour >= 14 && hour < 18) {
    return {
      title: "Afternoon Focus",
      message:
        "Keep the momentum going. You're doing great. What's next on the list?",
    };
  } else if (hour >= 18 && hour < 21) {
    return {
      title: "Evening Wind Down",
      message:
        "The day is shifting. Time to relax and reflect on what you've accomplished.",
    };
  } else {
    return {
      title: "Late Night Thoughts",
      message:
        "The stars are out. Capture your final thoughts before sleep takes over.",
    };
  }
};

// Load card order from localStorage
const loadCardOrder = () => {
  try {
    const saved = localStorage.getItem(CARD_ORDER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate that all cards are present
      if (DEFAULT_CARD_ORDER.every((id) => parsed.includes(id))) {
        return parsed;
      }
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_CARD_ORDER;
};

export default function Home() {
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [cardOrder, setCardOrder] = useState(loadCardOrder);
  const greeting = getTimeBasedGreeting();

  // Save card order to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(CARD_ORDER_KEY, JSON.stringify(cardOrder));
  }, [cardOrder]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(URL.createObjectURL(file));
    }
  };

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
  const netWorth = 55000;

  const studiedToday = getStudiedToday();
  const studyStreak = getStudyStreak();

  return (
    <PageTransition className="min-h-screen bg-[#F2F2F7] pb-32">
      {/* iOS 18 Large Title Navigation */}
      <header className="pt-14 pb-4 px-5 bg-[#F2F2F7] sticky top-0 z-10">
        {/* Top row: Date + Edit button (iOS HIG: trailing text action) */}
        <div className="flex justify-between items-center mb-1">
          <p className="ios-nav-date">{formatDate()}</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsEditMode(!isEditMode)}
            className="text-[17px] font-normal text-[#007AFF] active:opacity-60"
          >
            {isEditMode ? "Done" : "Edit"}
          </motion.button>
        </div>

        {/* Bottom row: Large Title + secondary actions */}
        <div className="flex justify-between items-end">
          <GsapText delay={0.1}>
            <h1 className="ios-large-title">Summary</h1>
          </GsapText>

          <div className="flex items-center gap-3">
            <WeatherWidget />

            {/* Profile Avatar */}
            <label className="relative cursor-pointer shrink-0">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <motion.div
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full overflow-hidden border border-black/5 shadow-sm"
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white font-bold text-sm">
                    JN
                  </div>
                )}
              </motion.div>
            </label>
          </div>
        </div>
      </header>

      {/* Reorderable Cards */}
      <Reorder.Group
        axis="y"
        values={cardOrder}
        onReorder={setCardOrder}
        className="px-5 space-y-3"
      >
        {cardOrder.map((cardId) => {
          // Render card based on ID
          const CardContent = () => {
            switch (cardId) {
              case "focus":
                return (
                  <SystemCard
                    onClick={isEditMode ? undefined : () => navigate("/growth")}
                  >
                    <motion.div layoutId="growth-hero-card">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[13px] font-semibold text-[#007AFF] uppercase tracking-wide">
                          Focus
                        </span>
                        {!isEditMode && (
                          <ChevronRight size={18} className="text-[#C7C7CC]" />
                        )}
                      </div>

                      {activeStudyGoal ? (
                        <>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#007AFF]/10 to-[#5856D6]/10 flex items-center justify-center">
                                <span className="text-3xl">📚</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[17px] font-semibold text-black leading-tight truncate">
                                  {activeStudyGoal.name}
                                </p>
                                <p className="text-[15px] text-[rgba(60,60,67,0.6)] mt-0.5">
                                  {activeStudyGoal.target}
                                </p>
                              </div>
                            </div>
                            {studyStreak > 0 && (
                              <div className="text-right">
                                <p className="text-[20px] font-bold text-[#007AFF]">
                                  {studyStreak}
                                </p>
                                <p className="text-[11px] text-[rgba(60,60,67,0.6)]">
                                  day streak
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Did you study today? */}
                          {!isEditMode && (
                            <div className="mt-4 pt-4 border-t border-[rgba(60,60,67,0.12)]">
                              <p className="text-[14px] font-medium text-center text-[rgba(60,60,67,0.8)] mb-3">
                                Did you study today? 📖
                              </p>
                              <div
                                className="flex gap-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markStudiedToday(true, markLearnStuffDone);
                                  }}
                                  className={`flex-1 py-3 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 transition-all ${
                                    studiedToday === true
                                      ? "bg-[#34C759] text-white shadow-lg shadow-[#34C759]/25"
                                      : "bg-[#34C759]/10 text-[#34C759]"
                                  }`}
                                >
                                  <Check size={18} strokeWidth={3} />
                                  Yes
                                </motion.button>
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markStudiedToday(false);
                                  }}
                                  className={`flex-1 py-3 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 transition-all ${
                                    studiedToday === false
                                      ? "bg-[#FF3B30] text-white shadow-lg shadow-[#FF3B30]/25"
                                      : "bg-[#FF3B30]/10 text-[#FF3B30]"
                                  }`}
                                >
                                  <X size={18} strokeWidth={3} />
                                  No
                                </motion.button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[rgba(120,120,128,0.08)] to-[rgba(120,120,128,0.12)] flex items-center justify-center">
                              <span className="text-3xl">🎯</span>
                            </div>
                            <div>
                              <p className="text-[17px] font-semibold text-black leading-tight">
                                No Study Goal
                              </p>
                              <p className="text-[15px] text-[rgba(60,60,67,0.6)] mt-0.5">
                                Tap to select a certificate
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </SystemCard>
                );

              case "protocol":
                return (
                  <SystemCard
                    onClick={
                      isEditMode ? undefined : () => navigate("/protocol")
                    }
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[13px] font-semibold text-[#FF9500] uppercase tracking-wide">
                        Protocol
                      </span>
                      {!isEditMode && (
                        <ChevronRight size={18} className="text-[#C7C7CC]" />
                      )}
                    </div>

                    {allPhasesComplete ? (
                      <div className="flex items-center gap-4 mt-3">
                        <div className="w-14 h-14 rounded-2xl bg-[#34C759]/10 flex items-center justify-center">
                          <span className="text-3xl">🏆</span>
                        </div>
                        <div>
                          <h4 className="text-[17px] font-bold text-[#34C759]">
                            All Completed
                          </h4>
                          <p className="text-[15px] text-[rgba(60,60,67,0.6)]">
                            17/17 Habits Done
                          </p>
                        </div>
                      </div>
                    ) : (
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
                        {/* iOS-style Progress Bar */}
                        <div className="h-2 bg-[rgba(120,120,128,0.12)] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: "#FF9500" }}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{
                              duration: 0.8,
                              ease: [0.19, 1, 0.22, 1],
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Habit Streak Calendar */}
                    {!isEditMode && (
                      <HabitStreakGrid className="mt-6 border-t border-[rgba(60,60,67,0.08)]" />
                    )}
                  </SystemCard>
                );

              case "wealth":
                return (
                  <SystemCard
                    onClick={isEditMode ? undefined : () => navigate("/wealth")}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[13px] font-semibold text-[#FF3B30] uppercase tracking-wide">
                        Priority Payment
                      </span>
                      {!isEditMode && (
                        <ChevronRight size={18} className="text-[#C7C7CC]" />
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center">
                          <span className="text-2xl">🤝</span>
                        </div>
                        <div>
                          <p className="text-[17px] font-semibold text-black">
                            Loan from Kuya
                          </p>
                          <p className="text-[13px] text-[rgba(60,60,67,0.6)]">
                            Personal Loan
                          </p>
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[28px] font-bold text-[#FF3B30] tracking-tight">
                          ₱16,000
                        </span>
                        <span className="text-[13px] font-medium text-[rgba(60,60,67,0.6)]">
                          Outstanding
                        </span>
                      </div>
                    </div>
                  </SystemCard>
                );

              case "journal":
                return (
                  <div
                    onClick={
                      isEditMode ? undefined : () => navigate("/journal")
                    }
                    className="relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all duration-200"
                    style={{
                      backgroundColor: "rgba(88, 86, 214, 0.08)",
                      border: "0.5px solid rgba(88, 86, 214, 0.15)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-[19px] font-semibold text-[#5856D6]">
                        {greeting.title}
                      </h3>
                      {!isEditMode && (
                        <ChevronRight size={18} className="text-[#5856D6]/40" />
                      )}
                    </div>
                    <p className="text-[15px] text-[#5856D6]/70 mb-5 leading-relaxed">
                      {greeting.message}
                    </p>
                    {!isEditMode && (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-3.5 rounded-xl bg-[#5856D6] text-white font-semibold text-[15px] shadow-lg shadow-[#5856D6]/25"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/journal");
                        }}
                      >
                        Write Entry
                      </motion.button>
                    )}
                  </div>
                );

              default:
                return null;
            }
          };

          return (
            <Reorder.Item
              key={cardId}
              value={cardId}
              dragListener={isEditMode}
              className={`relative ${
                isEditMode ? "cursor-grab active:cursor-grabbing" : ""
              }`}
            >
              {/* Drag Handle Overlay in Edit Mode */}
              {isEditMode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute left-0 top-0 bottom-0 w-12 z-10 flex items-center justify-center"
                >
                  <div className="w-10 h-10 rounded-full bg-[rgba(120,120,128,0.2)] flex items-center justify-center">
                    <GripVertical
                      size={20}
                      className="text-[rgba(60,60,67,0.6)]"
                    />
                  </div>
                </motion.div>
              )}

              {/* Card with left padding in edit mode */}
              <div className={isEditMode ? "pl-12" : ""}>
                <CardContent />
              </div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {/* Export Data Button (floating) */}
      <ExportDataButton />
    </PageTransition>
  );
}
