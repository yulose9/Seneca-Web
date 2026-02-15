import { signOut } from "firebase/auth";
import { motion, Reorder } from "framer-motion";
import { ChevronRight, GripVertical, LogOut } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExportDataButton from "../components/ExportDataButton";
import GsapText from "../components/GsapText";
import PageTransition from "../components/PageTransition";
import ProtocolCarousel from "../components/ProtocolCarousel";
import SystemCard from "../components/SystemCard";
import WeatherWidget from "../components/WeatherWidget";
import { useProtocol } from "../context/ProtocolContext";
import { getGlobalData, subscribeToGlobalData } from "../services/dataLogger";
import { auth } from "../services/firebase";

// LocalStorage key for card order
const CARD_ORDER_KEY = "home_card_order";

// Default card order (focus + protocol are now in the carousel)
const DEFAULT_CARD_ORDER = ["wealth", "journal"];

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

// Get dynamic greeting based on time of day + journal/protocol state
const getTimeBasedGreeting = (
  hasJournalToday = false,
  protocolProgress = 0,
) => {
  const hour = new Date().getHours();

  // If user already journaled today, give contextual "finish strong" messages
  if (hasJournalToday) {
    if (hour >= 4 && hour < 12) {
      return {
        title: "Already Reflected ✓",
        message:
          "You've logged your thoughts this morning. Now go conquer the day.",
        buttonText: "View Entry",
      };
    } else if (hour >= 12 && hour < 18) {
      return {
        title: "Journal Logged ✓",
        message:
          protocolProgress >= 80
            ? "Great progress today. Keep pushing through the rest of your protocol."
            : "You've reflected. Now finish strong — complete your remaining tasks.",
        buttonText: "View Entry",
      };
    } else {
      return {
        title: "Day Captured ✓",
        message:
          protocolProgress >= 100
            ? "What a day. Protocol done, journal written. Rest well tonight."
            : "Your thoughts are saved. Wrap up any remaining tasks and wind down.",
        buttonText: "View Entry",
      };
    }
  }

  // No journal entry yet — prompt to write
  if (hour >= 4 && hour < 6) {
    return {
      title: "Early Riser",
      message:
        "The world is quiet. A perfect time to set your intentions for the day.",
      buttonText: "Write Entry",
    };
  } else if (hour >= 6 && hour < 12) {
    return {
      title: "Good Morning",
      message: "A fresh start awaits. What are your main goals for today?",
      buttonText: "Write Entry",
    };
  } else if (hour >= 12 && hour < 14) {
    return {
      title: "Midday Check-in",
      message:
        "Half the day is gone. How are you feeling? Time to refuel and reset.",
      buttonText: "Write Entry",
    };
  } else if (hour >= 14 && hour < 18) {
    return {
      title: "Afternoon Focus",
      message:
        "Keep the momentum going. You're doing great. What's next on the list?",
      buttonText: "Write Entry",
    };
  } else if (hour >= 18 && hour < 21) {
    return {
      title: "Evening Wind Down",
      message:
        "The day is shifting. Time to relax and reflect on what you've accomplished.",
      buttonText: "Write Entry",
    };
  } else {
    return {
      title: "Late Night Thoughts",
      message:
        "The stars are out. Capture your final thoughts before sleep takes over.",
      buttonText: "Write Entry",
    };
  }
};

// Load card order from localStorage
const loadCardOrder = () => {
  try {
    const saved = localStorage.getItem(CARD_ORDER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Filter to only cards that still exist, then validate
      const filtered = parsed.filter((id) => DEFAULT_CARD_ORDER.includes(id));
      if (DEFAULT_CARD_ORDER.every((id) => filtered.includes(id))) {
        return filtered;
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
  const [hasJournalToday, setHasJournalToday] = useState(false);

  // Obligation + tasks reminders — chained on app open


  // 🌐 Wealth data from global sync
  const [wealthData, setWealthData] = useState({
    netWorth: 0,
    priorityLiability: null, // The "Loan from Kuya" or whatever is marked as priority
  });

  // Save card order to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(CARD_ORDER_KEY, JSON.stringify(cardOrder));
  }, [cardOrder]);

  // 🔄 Fetch global wealth data on mount and subscribe to updates
  useEffect(() => {
    const fetchWealth = async () => {
      try {
        const cloudWealth = await getGlobalData("wealth");
        if (cloudWealth) {
          const totalAssets =
            cloudWealth.assets?.reduce((sum, a) => sum + (a.amount || 0), 0) ||
            0;
          const totalLiabs =
            cloudWealth.liabilities?.reduce(
              (sum, l) => sum + (l.amount || 0),
              0,
            ) || 0;
          const priorityLiab =
            cloudWealth.liabilities?.find((l) => l.isPriority) || null;

          setWealthData({
            netWorth: totalAssets - totalLiabs,
            priorityLiability: priorityLiab,
          });
        }
      } catch (error) {
        console.error("[Home] Failed to fetch wealth data:", error);
      }
    };

    fetchWealth();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToGlobalData("wealth", (cloudWealth) => {
      if (cloudWealth) {
        const totalAssets =
          cloudWealth.assets?.reduce((sum, a) => sum + (a.amount || 0), 0) || 0;
        const totalLiabs =
          cloudWealth.liabilities?.reduce(
            (sum, l) => sum + (l.amount || 0),
            0,
          ) || 0;
        const priorityLiab =
          cloudWealth.liabilities?.find((l) => l.isPriority) || null;

        setWealthData({
          netWorth: totalAssets - totalLiabs,
          priorityLiability: priorityLiab,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(URL.createObjectURL(file));
    }
  };

  const { progress } = useProtocol();

  const netWorth = wealthData.netWorth;

  const greeting = getTimeBasedGreeting(hasJournalToday, progress);

  // Check if user has a journal entry today
  useEffect(() => {
    const checkJournal = () => {
      try {
        const saved = localStorage.getItem("journal_entries");
        if (saved) {
          const entries = JSON.parse(saved);
          const today = new Date().toISOString().split("T")[0];
          setHasJournalToday(entries.some((e) => e.isoDate === today));
        }
      } catch {
        /* ignore */
      }
    };

    checkJournal();

    // Also subscribe to global journal data for real-time updates
    const unsubscribe = subscribeToGlobalData("journal", (journalData) => {
      if (journalData?.entries) {
        const today = new Date().toISOString().split("T")[0];
        setHasJournalToday(
          journalData.entries.some((e) => e.isoDate === today),
        );
      }
    });

    return () => unsubscribe();
  }, []);

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

      {/* Protocol Carousel — swipeable goal cards */}
      <div className="px-5 mb-3">
        <ProtocolCarousel />
      </div>

      {/* Reorderable Cards */}
      <Reorder.Group
        axis="y"
        values={cardOrder}
        onReorder={setCardOrder}
        className="px-5 space-y-3"
      >
        {cardOrder.map((cardId) => {
          // Render card content directly to avoid re-mounting component
          const getCardContent = () => {
            switch (cardId) {
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
                            {wealthData.priorityLiability?.name ||
                              "Loan from Kuya"}
                          </p>
                          <p className="text-[13px] text-[rgba(60,60,67,0.6)]">
                            {wealthData.priorityLiability?.platform ||
                              "Personal Loan"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[28px] font-bold text-[#FF3B30] tracking-tight">
                          ₱
                          {(
                            wealthData.priorityLiability?.amount || 0
                          ).toLocaleString()}
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
                        className={`w-full py-3.5 rounded-xl font-semibold text-[15px] shadow-lg ${
                          hasJournalToday
                            ? "bg-[#34C759] text-white shadow-[#34C759]/25"
                            : "bg-[#5856D6] text-white shadow-[#5856D6]/25"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/journal");
                        }}
                      >
                        {greeting.buttonText || "Write Entry"}
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
                {getCardContent()}
              </div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {/* Logout Button */}
      <div className="px-5 mt-6 mb-8">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={async () => {
            if (confirm("Are you sure you want to log out?")) {
              await signOut(auth);
              navigate("/login");
            }
          }}
          className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-[17px] font-medium text-[#FF3B30] bg-white border border-[rgba(60,60,67,0.12)] active:bg-[rgba(0,0,0,0.05)] transition-colors"
        >
          <LogOut size={18} />
          Log Out
        </motion.button>
      </div>

      {/* Export Data Button (floating) */}
      <ExportDataButton />

    </PageTransition>
  );
}
