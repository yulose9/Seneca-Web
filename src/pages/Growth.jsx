import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Clock, Lock, Minus, Plus } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import AddCertificationSheet from "../components/AddCertificationSheet";
import AddGoalSheet from "../components/AddGoalSheet";
import CertificationDetailSheet from "../components/CertificationDetailSheet";
import GsapStagger from "../components/GsapStagger";
import GsapText from "../components/GsapText";
import PageTransition from "../components/PageTransition";
import CalendarViewSheet from "../components/CalendarViewSheet";
import { usePersonalGoals } from "../context/PersonalGoalsContext";
import { useProtocol } from "../context/ProtocolContext";
import { useStudyGoal } from "../context/StudyGoalContext";


const INITIAL_DOMAINS = [
  {
    id: "technical",
    title: "Technical Mastery",
    color: "#FF3B30",
    icon: "⚡",
    // Organized by vendor/technology with prerequisite chains
    subcategories: [
      {
        name: "Infrastructure as Code",
        icon: "🏗️",
        modules: [
          {
            name: "HashiCorp Certified: Terraform Associate",
            level: "Intermediate",
            target: "PASSED (Mar 3, 2025)",
            status: "done",
            vendor: "HashiCorp",
          },
        ],
      },
      {
        name: "Amazon Web Services (AWS)",
        icon: "☁️",
        modules: [
          // AWS Learning Path: Practitioner → Associate → Professional
          {
            name: "AWS Cloud Practitioner",
            level: "Foundational",
            target: "Y1 Q3-Q4",
            status: "progress",
            vendor: "AWS",
            prereq: null,
          },
          {
            name: "AWS Solutions Architect - Associate",
            level: "Associate",
            target: "Y1 Q3-Q4",
            status: "progress",
            vendor: "AWS",
            prereq: "AWS Cloud Practitioner",
          },
          {
            name: "AWS Developer - Associate",
            level: "Associate",
            target: "Y2 Q2",
            status: "locked",
            vendor: "AWS",
            prereq: "AWS Cloud Practitioner",
          },
          {
            name: "AWS Solutions Architect - Professional",
            level: "Professional",
            target: "Y1 Q4",
            status: "locked",
            vendor: "AWS",
            prereq: "AWS Solutions Architect - Associate",
          },
          {
            name: "AWS DevOps Engineer - Professional",
            level: "Professional",
            target: "Y2 Q3",
            status: "locked",
            vendor: "AWS",
            prereq: "AWS Developer - Associate",
          },
        ],
      },
      {
        name: "Red Hat Linux & OpenShift",
        icon: "🎩",
        modules: [
          // Red Hat Path: RHCSA → RHCE → OpenShift
          {
            name: "Red Hat Certified Systems Administrator (EX200)",
            level: "Associate",
            target: "Oct 24, 2025",
            status: "progress",
            vendor: "Red Hat",
            prereq: null,
          },
          {
            name: "Red Hat Certified Engineer (EX294)",
            level: "Professional",
            target: "Y1 Q2-Q3",
            status: "locked",
            vendor: "Red Hat",
            prereq: "RHCSA (EX200)",
          },
          {
            name: "Red Hat OpenShift Admin (EX280)",
            level: "Professional",
            target: "Sep 17, 2025",
            status: "locked",
            vendor: "Red Hat",
            prereq: "RHCSA (EX200)",
          },
        ],
      },
      {
        name: "DevOps & Version Control",
        icon: "🔄",
        modules: [
          {
            name: "GitHub Foundations",
            level: "Foundational",
            target: "Y2 Q3-Q4",
            status: "locked",
            vendor: "GitHub",
            prereq: null,
          },
        ],
      },
    ],
  },
  {
    id: "communication",
    title: "Communication Core",
    color: "#007AFF",
    icon: "🗣️",
    modules: [
      {
        name: "Grammar Hangover",
        level: "Basic",
        target: "Y1 Q1-Q2",
        status: "done",
      },
      {
        name: "EM and IM Culture",
        level: "Basic",
        target: "Y1 Q1-Q2",
        status: "done",
      },
      {
        name: "Rule the Room",
        level: "Basic",
        target: "Y1 Q3-Q4",
        status: "progress",
      },
      {
        name: "Public Speaking & Presentation",
        level: "Basic",
        target: "Y1 Q3-Q4",
        status: "progress",
      },
      {
        name: "Technical Business Writing",
        level: "Intermediate",
        target: "Y1 Q3-Q4",
        status: "locked",
      },
      {
        name: "Active Listening & Comprehension",
        level: "Basic",
        target: "Y1 Q3-Q4",
        status: "locked",
      },
      {
        name: "Diplomacy & Tact",
        level: "Intermediate",
        target: "Y2 Q1-Q2",
        status: "locked",
      },
    ],
  },
  {
    id: "collaboration",
    title: "Collaboration & Problem Solving",
    color: "#34C759",
    icon: "🤝",
    modules: [
      {
        name: "Building a Super Team",
        level: "Basic",
        target: "Y1 Q3-Q4",
        status: "progress",
      },
      {
        name: "Boosting Productivity through 5S",
        level: "Basic",
        target: "Y1 Q3-Q4",
        status: "progress",
      },
      {
        name: "Customer Service (The 6 Cs)",
        level: "Basic",
        target: "Y1 Q3-Q4",
        status: "locked",
      },
      {
        name: "ITSM Essentials",
        level: "Basic",
        target: "Y1 Q3-Q4",
        status: "locked",
      },
      {
        name: "Critical Thinking",
        level: "Basic",
        target: "Y1 Q3-Q4",
        status: "progress",
      },
      {
        name: "Continuous Improvement (PDCA)",
        level: "Basic",
        target: "Y1 Q3-Q4",
        status: "locked",
      },
      {
        name: "Design Sprint & Strategy",
        level: "Advance",
        target: "Future",
        status: "locked",
      },
    ],
  },
  {
    id: "leadership",
    title: "Leadership & Governance",
    color: "#AF52DE",
    icon: "🛡️",
    modules: [
      {
        name: "Managing Resistance to Change",
        level: "Basic",
        target: "Y1 Q3-Q4",
        status: "progress",
      },
      {
        name: "Philippine Labor Law",
        level: "Basic",
        target: "Y1 Q3-Q4",
        status: "locked",
      },
      {
        name: "Project Management PMP",
        level: "Expert",
        target: "Y2 Q4",
        status: "locked",
      },
    ],
  },
];

// iOS 18 Progress Ring
const ProgressRing = ({
  progress,
  size = 56,
  strokeWidth = 5,
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
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          style={{ stroke: "rgba(120, 120, 128, 0.12)" }}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{ stroke: color }}
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>
        {progress}%
      </span>
    </div>
  );
};

// Section Header Component
const SectionHeader = ({ title, color, icon }) => (
  <div className="flex items-center mb-3 mt-8 px-1">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center mr-3"
      style={{ backgroundColor: `${color}15` }}
    >
      <span className="text-lg">{icon}</span>
    </div>
    <h2 className="text-xl font-bold tracking-tight" style={{ color }}>
      {title}
    </h2>
  </div>
);

// Status Icon Component
const StatusIcon = ({ status }) => {
  if (status === "done") {
    return (
      <div className="w-7 h-7 rounded-full bg-[#34C759] flex items-center justify-center">
        <Check size={14} strokeWidth={3} className="text-white" />
      </div>
    );
  }
  if (status === "progress") {
    return (
      <div className="w-7 h-7 rounded-full bg-[#FF9500] flex items-center justify-center">
        <Clock size={14} strokeWidth={2.5} className="text-white" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-[rgba(120,120,128,0.12)] flex items-center justify-center">
      <Lock size={12} strokeWidth={2.5} className="text-[rgba(60,60,67,0.3)]" />
    </div>
  );
};

// Course Row Component - now clickable to open detail sheet
const CourseRow = ({
  item,
  isLast,
  color,
  onClick,
  isActive,
  effectiveStatus,
}) => {
  const status = effectiveStatus || item.status;
  return (
    <motion.div
      onClick={() => onClick?.(item)}
      whileTap={{ scale: 0.98, backgroundColor: "rgba(0,0,0,0.02)" }}
      className={clsx(
        "flex items-center py-4 px-4 cursor-pointer transition-all",
        !isLast && "border-b border-[rgba(60,60,67,0.12)]",
        isActive && "bg-[#007AFF]/5"
      )}
    >
      <StatusIcon status={status} />
      <div className="flex-1 min-w-0 ml-3">
        <p
          className={clsx(
            "text-[16px] font-semibold leading-tight mb-1 truncate",
            status === "locked" ? "text-[rgba(60,60,67,0.3)]" : "text-black"
          )}
        >
          {item.name}
        </p>
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md"
            style={{
              backgroundColor:
                status === "locked" ? "rgba(120,120,128,0.08)" : `${color}12`,
              color: status === "locked" ? "rgba(60,60,67,0.3)" : color,
            }}
          >
            {item.level}
          </span>
          <span className="text-[13px] text-[rgba(60,60,67,0.6)] truncate">
            {item.target}
          </span>
        </div>
      </div>
      {isActive && (
        <div className="ml-2 px-2 py-1 bg-[#007AFF] rounded-md">
          <span className="text-[10px] font-bold text-white uppercase">
            Studying
          </span>
        </div>
      )}
      <ChevronRight size={18} className="text-[rgba(60,60,67,0.3)] ml-2" />
    </motion.div>
  );
};
// Helper to format date as YYYY-MM-DD using LOCAL timezone
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Clickable Weekly Streak Grid Component (matches HabitStreakGrid design)
const ClickableStreakGrid = ({
  history = {},
  color = "#8B5CF6",
  weeksToShow = 3,
  onToggle,
}) => {
  const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  // Generate date range aligned to MONDAY
  const gridToday = new Date();
  gridToday.setHours(0, 0, 0, 0);
  const todayStr = formatLocalDate(gridToday);

  const dayOfWeek = gridToday.getDay();
  const currentDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const mondayOfCurrentWeek = new Date(gridToday);
  mondayOfCurrentWeek.setDate(gridToday.getDate() - currentDayIndex);

  const startDate = new Date(mondayOfCurrentWeek);
  startDate.setDate(mondayOfCurrentWeek.getDate() - (weeksToShow - 1) * 7);

  const dates = [];
  const totalDays = weeksToShow * 7;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    dates.push(new Date(d));
  }

  return (
    <div className="mt-4">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {days.map((day) => (
          <div
            key={day}
            className="text-center text-[11px] font-bold text-[#8E8E93]/80 uppercase tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2">
        {dates.map((date, index) => {
          const isFuture = date > gridToday;
          const dateStr = formatLocalDate(date);

          if (isFuture) {
            return (
              <div
                key={index}
                className="aspect-square rounded-[4px] bg-[rgba(120,120,128,0.08)] opacity-30"
              />
            );
          }

          const isComplete = history[dateStr] === true;
          const isFailed = history[dateStr] === false;
          const isToday = dateStr === todayStr;
          const hasNoData = history[dateStr] === undefined;

          let bgStyle = {};
          let glowStyle = {};

          if (isFailed) {
            // Failed day - dark gray
            bgStyle = { backgroundColor: "#2C2C2E" };
          } else if (isComplete) {
            // Complete - solid color with glow
            bgStyle = { backgroundColor: color };
            glowStyle = {
              boxShadow: `0 0 12px ${color}80, 0 2px 8px ${color}60`,
            };
          } else if (hasNoData) {
            // No data yet - light gray
            bgStyle = { backgroundColor: "rgba(120,120,128,0.08)" };
          } else {
            // Partial (fallback)
            bgStyle = { backgroundColor: color, opacity: 0.5 };
          }

          return (
            <motion.div
              key={index}
              onClick={() => onToggle && onToggle(dateStr)}
              whileTap={{ scale: 0.85 }}
              className={clsx(
                "aspect-square rounded-[4px] relative transition-all duration-300 cursor-pointer active:opacity-80",
                isToday &&
                "ring-2 ring-offset-2 ring-offset-white ring-[#007AFF]"
              )}
              style={{ ...bgStyle, ...glowStyle }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: isComplete && isToday ? 1.05 : 1,
                opacity: bgStyle.opacity || 1,
              }}
              transition={{
                delay: index * 0.02,
                scale: { type: "spring", stiffness: 400, damping: 25 },
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// Goal Card Component (Habit-style like "No Porn")
const HabitGoalCard = ({ title, emoji, color, history, onToggle }) => (
  <div className="bg-white rounded-2xl p-5 border border-black/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
    <div className="flex items-center gap-3 mb-1">
      <span className="text-2xl">{emoji}</span>
      <h3 className="text-[20px] font-bold text-black">{title}</h3>
    </div>
    <div className="h-[1px] bg-[rgba(60,60,67,0.12)] my-3" />
    <ClickableStreakGrid history={history} color={color} onToggle={onToggle} />
  </div>
);

// Study Goal Card Component - for tracking certification study
const StudyGoalCard = ({ certificate, history, onToggle, onClear }) => {
  if (!certificate) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-black/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">📚</span>
          <h3 className="text-[20px] font-bold text-black">Study Goal</h3>
        </div>
        <div className="h-[1px] bg-[rgba(60,60,67,0.12)] my-3" />
        <div className="py-8 text-center">
          <p className="text-[15px] text-[rgba(60,60,67,0.6)] mb-2">
            No certificate selected
          </p>
          <p className="text-[13px] text-[rgba(60,60,67,0.4)]">
            Tap on a certificate below to set it as your study goal
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-black/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📚</span>
          <h3 className="text-[20px] font-bold text-black">Study Goal</h3>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClear}
          className="text-[13px] font-medium text-[#FF3B30]"
        >
          Clear
        </motion.button>
      </div>

      <div className="h-[1px] bg-[rgba(60,60,67,0.12)] my-3" />

      {/* Active Certificate Info */}
      <div className="bg-[#007AFF]/5 rounded-xl p-4 mb-4">
        <p className="text-[16px] font-semibold text-black leading-tight mb-1">
          {certificate.name}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#007AFF]/15 text-[#007AFF]">
            {certificate.level}
          </span>
          <span className="text-[13px] text-[rgba(60,60,67,0.6)]">
            Target: {certificate.target}
          </span>
        </div>
      </div>

      {/* Did you study today prompt */}
      <p className="text-[14px] font-medium text-[rgba(60,60,67,0.8)] mb-2 text-center">
        Did you study today? 📖
      </p>

      <ClickableStreakGrid
        history={history}
        color="#007AFF"
        onToggle={onToggle}
      />
    </div>
  );
};

// Weight Goal Card Component (with progress bar)
import WeightInputDialog from "../components/WeightInputDialog";

// Weight Goal Card Component (with progress bar)
const WeightGoalCard = ({
  title,
  emoji,
  currentWeight,
  goalWeight,
  history,
  color,
  onUpdateWeight,
  onToggle,
}) => {
  const startingWeight = 120;
  const progress = Math.max(
    0,
    Math.min(
      100,
      ((startingWeight - currentWeight) / (startingWeight - goalWeight)) * 100
    )
  );
  const weightLost = startingWeight - currentWeight;

  return (
    <div className="bg-white rounded-2xl p-5 border border-black/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-2xl">{emoji}</span>
        <h3 className="text-[20px] font-bold text-black">{title}</h3>
      </div>
      <div className="h-[1px] bg-[rgba(60,60,67,0.12)] my-3" />

      {/* Weight Progress Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-black">Weight</span>
            <span className="text-[15px] text-[rgba(60,60,67,0.6)]">
              {currentWeight}kg
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[rgba(60,60,67,0.6)]">
              Goal {goalWeight}kg
            </span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onUpdateWeight}
              className="w-7 h-7 rounded-full bg-[#007AFF] flex items-center justify-center shadow-sm"
            >
              <Plus size={16} className="text-white" strokeWidth={3} />
            </motion.button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-[rgba(120,120,128,0.12)] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
          />
        </div>

        <p className="text-[14px] text-[rgba(60,60,67,0.6)] mt-2">
          You lost{" "}
          <span className="font-semibold text-black">
            {weightLost > 0 ? weightLost : 0} kg
          </span>
        </p>
      </div>

      <ClickableStreakGrid
        history={history}
        color={color}
        onToggle={onToggle}
      />
    </div>
  );
};

export default function Growth() {
  // Shared study goal context
  const {
    activeStudyGoal,
    studyHistory,
    setStudyGoal,
    clearStudyGoal,
    toggleStudyDate,
    formatLocalDate,
  } = useStudyGoal();

  // Protocol context for Learn Stuff integration
  const { markLearnStuffDone } = useProtocol();

  // Personal goals context (persisted with localStorage + dataLogger)
  const {
    goals,
    goalHistory,
    toggleGoalDate,
    updateWeight,
    addGoal,
    deleteGoal,
    getGoalsArray,
  } = usePersonalGoals();

  // State for add goal sheet
  const [showAddGoalSheet, setShowAddGoalSheet] = useState(false);
  const [weightDialogVisible, setWeightDialogVisible] = useState(false);

  // State for certification sheets
  const [showAddCertSheet, setShowAddCertSheet] = useState(false);
  const [showCertDetailSheet, setShowCertDetailSheet] = useState(false);
  const [selectedCertification, setSelectedCertification] = useState(null);
  const [showCalendarSheet, setShowCalendarSheet] = useState(false);

  // State for custom certifications (persisted)
  const [customCertifications, setCustomCertifications] = useState(() => {
    const saved = localStorage.getItem("seneca_custom_certifications");
    return saved ? JSON.parse(saved) : [];
  });

  // State for certification status overrides (persisted)
  // State for certification statuses overrides (persisted) - DEPRECATED in favor of domains state, but kept for cleanup if needed
  // We'll just ignore it for now as we are migrating to 'domains' state source of truth.

  // Domains State (Single Source of Truth)
  const [domains, setDomains] = useState(() => {
    const saved = localStorage.getItem("seneca_domains");
    if (saved) return JSON.parse(saved);

    // Migration: Apply legacy statuses if no saved domains yet
    const legacyStatuses = JSON.parse(
      localStorage.getItem("seneca_certification_statuses") || "{}"
    );
    // Deep copy INITIAL_DOMAINS
    const migrated = JSON.parse(JSON.stringify(INITIAL_DOMAINS));

    // Apply overrides
    migrated.forEach((domain) => {
      if (domain.subcategories) {
        domain.subcategories.forEach((sub) => {
          sub.modules.forEach((mod) => {
            if (legacyStatuses[mod.name]) mod.status = legacyStatuses[mod.name];
          });
        });
      } else {
        domain.modules.forEach((mod) => {
          if (legacyStatuses[mod.name]) mod.status = legacyStatuses[mod.name];
        });
      }
    });
    return migrated;
  });

  // Persist domains
  useEffect(() => {
    localStorage.setItem("seneca_domains", JSON.stringify(domains));
  }, [domains]);

  // Persist custom certifications
  useEffect(() => {
    localStorage.setItem(
      "seneca_custom_certifications",
      JSON.stringify(customCertifications)
    );
  }, [customCertifications]);

  // Extract current values from context
  const currentWeight = goals.exercise?.currentWeight || 120;
  const goalWeight = goals.exercise?.goalWeight || 90;

  // Wrapper for study toggle that also marks Learn Stuff done when studying today
  const handleStudyToggle = useCallback(
    (dateStr) => {
      toggleStudyDate(dateStr);

      // If toggling today to "studied", also mark Learn Stuff done
      const today = formatLocalDate(new Date());
      if (dateStr === today) {
        // Check the NEXT state (if undefined -> true, if true -> false, if false -> undefined)
        const currentVal = studyHistory[dateStr];
        const nextVal =
          currentVal === undefined
            ? true
            : currentVal === true
              ? false
              : undefined;

        // If turning ON (nextVal is true), mark Learn Stuff
        if (nextVal === true) {
          markLearnStuffDone();
        }
      }
    },
    [toggleStudyDate, formatLocalDate, studyHistory, markLearnStuffDone]
  );

  const handleUpdateWeight = () => {
    setWeightDialogVisible(true);
  };

  const saveWeight = (newWeight) => {
    updateWeight(newWeight);
    setWeightDialogVisible(false);
  };

  // Certification handlers
  const handleCertificationClick = (cert) => {
    setSelectedCertification(cert);
    setShowCertDetailSheet(true);
  };

  // Unified Update Handler
  const handleUpdateCertification = (updatedCert) => {
    // Check if it's a custom cert
    if (updatedCert.isCustom || customCertifications.some(c => c.id === updatedCert.id)) {
      setCustomCertifications((prev) =>
        prev.map((c) => (c.id === updatedCert.id ? updatedCert : c))
      );
    } else {
      // It's a domain cert
      setDomains((prevDomains) => {
        const newDomains = [...prevDomains];
        // Find and update nested
        for (const domain of newDomains) {
          if (domain.subcategories) {
            for (const sub of domain.subcategories) {
              const idx = sub.modules.findIndex(m => m.name === updatedCert.name);
              if (idx !== -1) {
                sub.modules[idx] = { ...sub.modules[idx], ...updatedCert };
                return newDomains;
              }
            }
          } else if (domain.modules) {
            const idx = domain.modules.findIndex(m => m.name === updatedCert.name);
            if (idx !== -1) {
              domain.modules[idx] = { ...domain.modules[idx], ...updatedCert };
              return newDomains;
            }
          }
        }
        return newDomains;
      });
    }

    // Also update selected cert if it's currently open
    if (selectedCertification?.name === updatedCert.name) {
      setSelectedCertification(updatedCert);
    }
  };

  // Backward compatibility wrapper for status only
  const handleUpdateCertStatus = (cert, newStatus) => {
    handleUpdateCertification({ ...cert, status: newStatus });
  };

  const handleAddCertification = (newCert) => {
    setCustomCertifications((prev) => [...prev, newCert]);
  };

  const handleDeleteCertification = (cert) => {
    setCustomCertifications((prev) => prev.filter((c) => c.id !== cert.id));
  };

  // Helper to get effective status (now just returns the cert status as we update state directly)
  const getEffectiveStatus = (cert) => {
    return cert.status;
  };

  return (
    <PageTransition className="min-h-screen bg-[#F2F2F7] pb-32">
      {/* Header */}
      <header className="pt-14 px-5 pb-2">
        <GsapText>
          <h1 className="ios-large-title">Growth</h1>
        </GsapText>
        <GsapText delay={0.1}>
          <p className="text-[13px] font-medium text-[rgba(60,60,67,0.6)] uppercase tracking-wide mt-1">
            Goals & Certifications
          </p>
        </GsapText>
      </header>

      {/* Hero Progress Card */}
      <div className="px-5 mt-6 mb-4">
        <motion.div
          layoutId="growth-hero-card"
          onClick={() => setShowCalendarSheet(true)}
          whileTap={{ scale: 0.98 }}
          className="cursor-pointer relative overflow-hidden rounded-2xl p-5 bg-white border border-black/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.06)] active:bg-gray-50 transition-colors"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-[#34C759] uppercase tracking-widest mb-2">
                {activeStudyGoal ? "Currently Studying" : "Overall Progress"}
              </p>
              <p className="text-2xl font-bold text-black tracking-tight">
                {activeStudyGoal ? activeStudyGoal.name : "No Active Goal"}
              </p>
            </div>
            <ProgressRing
              progress={(() => {
                // Calculate actual cert completion %
                let total = 0;
                let done = 0;
                domains.forEach((domain) => {
                  if (domain.subcategories) {
                    domain.subcategories.forEach((sub) => {
                      sub.modules.forEach((m) => { total++; if (getEffectiveStatus(m) === "done") done++; });
                    });
                  } else if (domain.modules) {
                    domain.modules.forEach((m) => { total++; if (getEffectiveStatus(m) === "done") done++; });
                  }
                });
                customCertifications.forEach((c) => { total++; if (getEffectiveStatus(c) === "done") done++; });
                return total > 0 ? Math.round((done / total) * 100) : 0;
              })()}
              size={64}
              strokeWidth={5}
              color="#34C759"
            />
          </div>

          {activeStudyGoal && (
            <div className="mt-4 bg-[#007AFF]/10 rounded-xl py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[12px]">📚</span>
                  <p className="text-[14px] font-semibold text-[#007AFF]">
                    {activeStudyGoal.level} • Target: {activeStudyGoal.target}
                  </p>
                </div>
                {activeStudyGoal.vendor && (
                  <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#007AFF]/15 text-[#007AFF]">
                    {activeStudyGoal.vendor}
                  </span>
                )}
              </div>
            </div>
          )}

          {!activeStudyGoal && (
            <div className="mt-4 bg-[#34C759]/10 rounded-xl py-3 px-4">
              <p className="text-[14px] font-semibold text-[#34C759] text-center">
                Tap a certification below to set your study goal
              </p>
            </div>
          )}
        </motion.div>
      </div>

      <GsapStagger className="px-5" delay={0.2}>
        {/* Personal Goals Section with Add Button */}
        <div className="flex items-center justify-between mb-3 mt-8 px-1">
          <div className="flex items-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mr-3"
              style={{ backgroundColor: "#8B5CF615" }}
            >
              <span className="text-lg">🎯</span>
            </div>
            <h2
              className="text-xl font-bold tracking-tight"
              style={{ color: "#8B5CF6" }}
            >
              Personal Goals
            </h2>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAddGoalSheet(true)}
            className="w-8 h-8 rounded-full bg-[#8B5CF6] flex items-center justify-center shadow-md"
          >
            <Plus size={18} className="text-white" strokeWidth={2.5} />
          </motion.button>
        </div>

        <div className="space-y-4">
          {/* Study Goal Card - uses shared context */}
          <StudyGoalCard
            certificate={activeStudyGoal}
            history={studyHistory}
            onToggle={handleStudyToggle}
            onClear={clearStudyGoal}
          />

          {/* Render all goals dynamically */}
          {getGoalsArray().map((goal) => {
            // Special handling for exercise (weight goal)
            if (goal.id === "exercise") {
              return (
                <WeightGoalCard
                  key={goal.id}
                  title={goal.title}
                  emoji={goal.emoji}
                  currentWeight={currentWeight}
                  goalWeight={goalWeight}
                  history={goalHistory.exercise}
                  color={goal.color}
                  onUpdateWeight={handleUpdateWeight}
                  onToggle={(dateStr) => toggleGoalDate("exercise", dateStr)}
                />
              );
            }

            // All other goals render as habit cards
            return (
              <HabitGoalCard
                key={goal.id}
                title={goal.title}
                emoji={goal.emoji}
                color={goal.color}
                history={goalHistory[goal.id] || {}}
                onToggle={(dateStr) => toggleGoalDate(goal.id, dateStr)}
              />
            );
          })}
        </div>

        {/* Certifications Section with + Button */}
        <div className="flex items-center justify-between mb-3 mt-8 px-1">
          <div className="flex items-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mr-3"
              style={{ backgroundColor: "rgba(255, 59, 48, 0.15)" }}
            >
              <span className="text-lg">📜</span>
            </div>
            <h2
              className="text-xl font-bold tracking-tight"
              style={{ color: "#FF3B30" }}
            >
              Certifications
            </h2>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAddCertSheet(true)}
            className="w-8 h-8 rounded-full bg-[#007AFF] flex items-center justify-center shadow-sm"
          >
            <Plus size={18} strokeWidth={2.5} className="text-white" />
          </motion.button>
        </div>

        {/* Custom Certifications (if any) */}
        {customCertifications.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-base">✨</span>
              <h3 className="text-[15px] font-semibold text-[rgba(60,60,67,0.8)]">
                My Certifications
              </h3>
              <span className="text-[12px] text-[rgba(60,60,67,0.4)] ml-auto">
                {
                  customCertifications.filter(
                    (c) => getEffectiveStatus(c) === "done"
                  ).length
                }
                /{customCertifications.length} complete
              </span>
            </div>
            <div className="bg-white rounded-xl overflow-hidden border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {customCertifications.map((cert, index) => (
                <CourseRow
                  key={cert.id}
                  item={cert}
                  isLast={index === customCertifications.length - 1}
                  color="#007AFF"
                  onClick={handleCertificationClick}
                  isActive={activeStudyGoal?.name === cert.name}
                  effectiveStatus={getEffectiveStatus(cert)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Domain Sections */}
        {domains.map((domain) => (
          <div key={domain.id}>
            <SectionHeader
              title={domain.title}
              color={domain.color}
              icon={domain.icon}
            />

            {/* Check if domain has subcategories (new format) or modules (old format) */}
            {domain.subcategories ? (
              // Render subcategories (e.g., Technical Mastery with AWS, Red Hat, etc.)
              <div className="space-y-4">
                {domain.subcategories.map((subcat, subIndex) => (
                  <div key={subIndex}>
                    {/* Subcategory Header */}
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-base">{subcat.icon}</span>
                      <h3 className="text-[15px] font-semibold text-[rgba(60,60,67,0.8)]">
                        {subcat.name}
                      </h3>
                      <span className="text-[12px] text-[rgba(60,60,67,0.4)] ml-auto">
                        {
                          subcat.modules.filter(
                            (m) => getEffectiveStatus(m) === "done"
                          ).length
                        }
                        /{subcat.modules.length} complete
                      </span>
                    </div>

                    {/* Subcategory Modules */}
                    <div className="bg-white rounded-xl overflow-hidden border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                      {subcat.modules.map((module, index) => (
                        <CourseRow
                          key={index}
                          item={module}
                          isLast={index === subcat.modules.length - 1}
                          color={domain.color}
                          onClick={handleCertificationClick}
                          isActive={activeStudyGoal?.name === module.name}
                          effectiveStatus={getEffectiveStatus(module)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Render flat modules (old format)
              <div className="bg-white rounded-xl overflow-hidden border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                {domain.modules.map((module, index) => (
                  <CourseRow
                    key={index}
                    item={module}
                    isLast={index === domain.modules.length - 1}
                    color={domain.color}
                    onClick={handleCertificationClick}
                    isActive={activeStudyGoal?.name === module.name}
                    effectiveStatus={getEffectiveStatus(module)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </GsapStagger>

      {/* Footer */}
      <p className="text-center text-[rgba(60,60,67,0.3)] text-[11px] font-medium mt-10 mb-20">
        Generated from WDP2025r02 • Seneca AI
      </p>

      {/* Add Goal Sheet */}
      <AddGoalSheet
        visible={showAddGoalSheet}
        onClose={() => setShowAddGoalSheet(false)}
        onAddGoal={addGoal}
        onDeleteGoal={deleteGoal}
      />

      {/* Weight Input Dialog */}
      <WeightInputDialog
        visible={weightDialogVisible}
        onClose={() => setWeightDialogVisible(false)}
        onSave={saveWeight}
        currentWeight={currentWeight}
      />

      {/* Add Certification Sheet */}
      <AddCertificationSheet
        visible={showAddCertSheet}
        onClose={() => setShowAddCertSheet(false)}
        onAddCertification={handleAddCertification}
      />

      {/* Certification Detail Sheet */}
      <CertificationDetailSheet
        visible={showCertDetailSheet}
        onClose={() => {
          setShowCertDetailSheet(false);
          setSelectedCertification(null);
        }}
        certification={selectedCertification}
        onUpdateStatus={handleUpdateCertStatus}
        onUpdateCertification={handleUpdateCertification}
        onDelete={handleDeleteCertification}
        onSetStudyGoal={setStudyGoal}
        isCustom={selectedCertification?.isCustom}
      />
      {/* Certification Calendar Sheet */}
      <CalendarViewSheet
        visible={showCalendarSheet}
        onClose={() => setShowCalendarSheet(false)}
        domains={domains}
        customCertifications={customCertifications}
      />
    </PageTransition>
  );
}
