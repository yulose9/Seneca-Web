import clsx from "clsx";
import { useWebHaptics } from "web-haptics/react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Clock, Lock, Minus, Plus } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { EASE_OUT, TAP } from "../constants/motion";
import AddCertificationSheet from "../components/AddCertificationSheet";
import AddGoalSheet from "../components/AddGoalSheet";
import CertificationDetailSheet from "../components/CertificationDetailSheet";
import GsapStagger from "../components/GsapStagger";
import GsapText from "../components/GsapText";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/PageHeader";
import CalendarViewSheet from "../components/CalendarViewSheet";
import { usePersonalGoals } from "../context/PersonalGoalsContext";
import { useProtocol } from "../context/ProtocolContext";
import { useStudyGoal } from "../context/StudyGoalContext";
import { useCertificationDomains, useCustomCertifications } from "../data/syncedData";
import { calendarDateKey, getPhDateKey, parseDateKey } from "../utils/timeUtils";


const INITIAL_DOMAINS = [
  {
    id: "technical",
    title: "Technical Mastery",
    color: "#FF3B30",
    icon: "⚡",
    // Organized by vendor/technology with prerequisite chains
    subcategories: [
      {
        name: "Amazon Web Services (AWS)",
        icon: "☁️",
        modules: [
          { name: "AWS Certified Cloud Practitioner", level: "Foundational", target: "Y1", status: "done", vendor: "AWS" },
          { name: "AWS Certified Developer - Associate", level: "Associate", target: "Y1", status: "locked", vendor: "AWS" },
          { name: "AWS Certified Solutions Architect - Associate", level: "Associate", target: "Y1", status: "locked", vendor: "AWS" },
          { name: "AWS Certified SysOps Administrator - Associate", level: "Associate", target: "Y1", status: "locked", vendor: "AWS" },
          { name: "AWS Certified Solutions Architect - Professional", level: "Professional", target: "Y2", status: "locked", vendor: "AWS" },
          { name: "AWS Certified DevOps Engineer - Professional", level: "Professional", target: "Y2", status: "locked", vendor: "AWS" },
          { name: "AWS Certified AI Practitioner", level: "Foundational", target: "Y1", status: "locked", vendor: "AWS" },
          { name: "AWS Certified Machine Learning - Specialty", level: "Specialty", target: "Y2", status: "locked", vendor: "AWS" },
          { name: "AWS Certified Advanced Networking - Specialty", level: "Specialty", target: "Y2", status: "locked", vendor: "AWS" },
          { name: "AWS Certified Security - Specialty", level: "Specialty", target: "Y2", status: "locked", vendor: "AWS" },
        ],
      },
      {
        name: "Microsoft Azure",
        icon: "🔷",
        modules: [
          { name: "Microsoft Certified: Azure Fundamentals (AZ-900)", level: "Foundational", target: "Y1", status: "done", vendor: "Azure" },
          { name: "Microsoft Certified: Azure Administrator Associate (AZ-104)", level: "Associate", target: "Y1", status: "locked", vendor: "Azure" },
          { name: "Microsoft Certified: DevOps Engineer Expert (AZ-400)", level: "Expert", target: "Y2", status: "locked", vendor: "Azure" },
        ],
      },
      {
        name: "Linux & System Administration",
        icon: "🐧",
        modules: [
          { name: "Ubuntu System Administrator Certificate", level: "Associate", target: "Y1", status: "locked", vendor: "Linux" },
          { name: "Red Hat Certified System Administrator (RHCSA)", level: "Associate", target: "Oct 24, 2025", status: "progress", vendor: "Red Hat" },
          { name: "Red Hat Certified Engineer (RHCE)", level: "Professional", target: "Y1 Q2-Q3", status: "locked", vendor: "Red Hat" },
          { name: "Red Hat Certified Specialist in Containers", level: "Specialty", target: "Y1", status: "locked", vendor: "Red Hat" },
          { name: "Red Hat Certified Specialist in OpenShift Administration", level: "Specialty", target: "Sep 17, 2025", status: "locked", vendor: "Red Hat" },
          { name: "Linux Foundation Certified System Administrator (LFCS)", level: "Associate", target: "Y1", status: "locked", vendor: "Linux" },
          { name: "CompTIA Linux+", level: "Foundational", target: "Y1", status: "locked", vendor: "CompTIA" },
        ],
      },
      {
        name: "Networking & Security",
        icon: "🌐",
        modules: [
          { name: "CompTIA Network+", level: "Foundational", target: "Y1", status: "locked", vendor: "CompTIA" },
          { name: "CompTIA Security+", level: "Foundational", target: "Y1", status: "locked", vendor: "CompTIA" },
          { name: "Cisco CCNA", level: "Associate", target: "Y1", status: "locked", vendor: "Cisco" },
          { name: "Cisco CCNP Enterprise", level: "Professional", target: "Y2", status: "locked", vendor: "Cisco" },
        ],
      },
      {
        name: "Version Control & CI/CD",
        icon: "🔄",
        modules: [
          { name: "GitHub Foundations", level: "Foundational", target: "Y1", status: "locked", vendor: "GitHub" },
          { name: "GitHub Copilot", level: "Associate", target: "Y1", status: "locked", vendor: "GitHub" },
          { name: "GitHub Actions", level: "Associate", target: "Y1", status: "locked", vendor: "GitHub" },
          { name: "GitHub Administration", level: "Associate", target: "Y1", status: "locked", vendor: "GitHub" },
          { name: "GitHub Advanced Security", level: "Associate", target: "Y1", status: "locked", vendor: "GitHub" },
          { name: "GitHub Agentic AI (beta)", level: "Specialty", target: "Y1", status: "locked", vendor: "GitHub" },
          { name: "GitLab Fundamentals Associate", level: "Foundational", target: "Y1", status: "locked", vendor: "GitLab" },
          { name: "GitLab CI/CD Associate", level: "Associate", target: "Y1", status: "locked", vendor: "GitLab" },
          { name: "GitLab Security Associate", level: "Associate", target: "Y1", status: "locked", vendor: "GitLab" },
          { name: "Agile Portfolio Management Associate", level: "Associate", target: "Y1", status: "locked", vendor: "GitLab" },
          { name: "Duo Agent Platform Associate", level: "Associate", target: "Y1", status: "locked", vendor: "GitLab" },
          { name: "Certified Jenkins Engineer (CJE)", level: "Professional", target: "Y1", status: "locked", vendor: "Jenkins" },
          { name: "CloudBees CI Essentials", level: "Foundational", target: "Y1", status: "locked", vendor: "Jenkins" },
        ],
      },
      {
        name: "Infrastructure as Code",
        icon: "🏗️",
        modules: [
          { name: "HashiCorp Certified: Terraform Associate", level: "Associate", target: "PASSED (Mar 3, 2025)", status: "done", vendor: "HashiCorp" },
          { name: "Terraform Authoring and Operations Professional", level: "Professional", target: "Y2", status: "locked", vendor: "HashiCorp" },
          { name: "Vault Associate", level: "Associate", target: "Y1", status: "locked", vendor: "HashiCorp" },
          { name: "Vault Operations Professional", level: "Professional", target: "Y2", status: "locked", vendor: "HashiCorp" },
          { name: "Consul Associate", level: "Associate", target: "Y1", status: "locked", vendor: "HashiCorp" },
        ],
      },
      {
        name: "Programming Languages",
        icon: "💻",
        modules: [
          { name: "PCEP™ - Certified Entry-Level Python Programmer", level: "Foundational", target: "Y1", status: "locked", vendor: "Python Institute" },
          { name: "JSE™ - Certified Entry-Level JavaScript Programmer", level: "Foundational", target: "Y1", status: "locked", vendor: "JS Institute" },
          { name: "Oracle Certified Associate - Java SE 8 Programmer", level: "Associate", target: "Y1", status: "locked", vendor: "Oracle" },
        ],
      },
      {
        name: "Observability & Monitoring",
        icon: "📊",
        modules: [
          { name: "Prometheus Certified Associate (PCA)", level: "Associate", target: "Y1", status: "locked", vendor: "Linux Foundation" },
          { name: "Certified Grafana Associate", level: "Associate", target: "Y1", status: "locked", vendor: "Grafana" },
        ],
      },
      {
        name: "Government / Civil",
        icon: "🏛️",
        modules: [
          { name: "Civil Service Professional", level: "Professional", target: "Y1", status: "locked", vendor: "Gov" },
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
  color = "var(--color-accent)",
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
          style={{ stroke: "var(--color-fill)" }}
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
      <span className="absolute text-subhead font-bold tabular-nums" style={{ color }}>
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
      <span className="text-body">{icon}</span>
    </div>
    {/* Title stays ink; the domain colour lives in the icon tile only */}
    <h2 className="text-title-3 font-semibold text-ink">
      {title}
    </h2>
  </div>
);

// Status Icon Component
const StatusIcon = ({ status }) => {
  if (status === "done") {
    return (
      <div className="w-7 h-7 rounded-full bg-positive flex items-center justify-center">
        <Check size={14} strokeWidth={3} className="text-white" />
      </div>
    );
  }
  if (status === "progress") {
    return (
      <div className="w-7 h-7 rounded-full bg-caution flex items-center justify-center">
        <Clock size={14} strokeWidth={2.5} className="text-white" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-fill flex items-center justify-center">
      <Lock size={12} strokeWidth={2.5} className="text-ink-3" />
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
        "flex items-center py-4 px-4 cursor-pointer transition-colors duration-150",
        !isLast && "border-b border-separator",
        isActive && "bg-accent/5"
      )}
    >
      <StatusIcon status={status} />
      <div className="flex-1 min-w-0 ml-3">
        <p
          className={clsx(
            "text-callout font-semibold mb-1 truncate",
            status === "locked" ? "text-ink-3" : "text-ink"
          )}
        >
          {item.name}
        </p>
        <div className="flex items-center gap-2">
          <span
            className="text-caption-2 font-semibold px-2 py-0.5 rounded-lg"
            style={{
              backgroundColor:
                status === "locked" ? "var(--color-fill)" : `${color}12`,
              color: status === "locked" ? "var(--color-ink-3)" : color,
            }}
          >
            {item.level}
          </span>
          <span className="text-footnote text-ink-2 truncate">
            {item.target}
          </span>
        </div>
      </div>
      {isActive && (
        <div className="ml-2 px-2 py-1 bg-accent rounded-lg">
          <span className="text-caption-2 font-semibold text-white">
            Studying
          </span>
        </div>
      )}
      <ChevronRight size={18} className="text-ink-3 ml-2" />
    </motion.div>
  );
};
// ─── Certification status persistence ────────────────────────────────────────
const forEachModule = (domains, fn) =>
  (domains || []).forEach((domain) =>
    (domain.subcategories ? domain.subcategories.flatMap((s) => s.modules) : domain.modules || []).forEach(fn),
  );

/** { certName: status } from a stored domains list. */
const statusMap = (domains) => {
  const map = {};
  forEachModule(domains, (mod) => { if (mod.status) map[mod.name] = mod.status; });
  return map;
};

/** Fresh copy of the built-in catalog with saved statuses applied. */
const withStatuses = (map) => {
  const fresh = JSON.parse(JSON.stringify(INITIAL_DOMAINS));
  forEachModule(fresh, (mod) => { if (map[mod.name]) mod.status = map[mod.name]; });
  return fresh;
};


// Clickable Weekly Streak Grid Component (matches HabitStreakGrid design)
const ClickableStreakGrid = ({
  history = {},
  color = "#8B5CF6",
  weeksToShow = 3,
  onToggle,
}) => {
  const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  // Grid is aligned to the Manila calendar day (history keys are Manila days)
  const todayStr = getPhDateKey();
  const gridToday = parseDateKey(todayStr);

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
            className="text-center text-caption-2 font-semibold text-ink-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2">
        {dates.map((date, index) => {
          const isFuture = date > gridToday;
          const dateStr = calendarDateKey(date);

          if (isFuture) {
            return (
              <div
                key={index}
                className="aspect-square rounded-[4px] bg-fill opacity-30"
              />
            );
          }

          const isComplete = history[dateStr] === true;
          const isFailed = history[dateStr] === false;
          const isToday = dateStr === todayStr;
          const hasNoData = history[dateStr] === undefined;

          let bgStyle = {};

          if (hasNoData) {
            // Nothing logged — quiet empty cell
            bgStyle = { backgroundColor: "var(--color-fill-strong)" };
          } else if (isFailed) {
            // Explicitly missed — a soft red, distinct from "no data"
            bgStyle = { backgroundColor: "color-mix(in srgb, var(--color-negative) 30%, transparent)" };
          } else if (isComplete) {
            // Complete - solid habit color (no glow: colour already carries it)
            bgStyle = { backgroundColor: color };
          } else {
            // Partial (fallback)
            bgStyle = { backgroundColor: `color-mix(in srgb, ${color} 50%, transparent)` };
          }

          return (
            <motion.div
              key={index}
              onClick={() => onToggle && onToggle(dateStr)}
              whileTap={TAP}
              className={clsx(
                "aspect-square rounded-[4px] relative transition-[background-color] duration-150 cursor-pointer",
                isToday &&
                "ring-2 ring-offset-2 ring-offset-surface ring-accent"
              )}
              style={bgStyle}
              // Mount-only stagger: animate targets never change, so toggling a
              // cell doesn't inherit its entrance delay.
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                opacity: { delay: index * 0.012, duration: 0.2, ease: EASE_OUT },
                scale: { delay: index * 0.012, type: "spring", duration: 0.3, bounce: 0 },
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
  <div className="bg-surface rounded-2xl p-5 shadow-card">
    <div className="flex items-center gap-3 mb-1">
      <span className="text-title-2">{emoji}</span>
      <h3 className="text-title-3 font-semibold text-ink">{title}</h3>
    </div>
    <div className="h-[1px] bg-separator my-3" />
    <ClickableStreakGrid history={history} color={color} onToggle={onToggle} />
  </div>
);

// Study Goal Card Component - for tracking certification study
const StudyGoalCard = ({ certificate, history, onToggle, onClear }) => {
  if (!certificate) {
    return (
      <div className="bg-surface rounded-2xl p-5 shadow-card">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-title-2">📚</span>
          <h3 className="text-title-3 font-semibold text-ink">Study Goal</h3>
        </div>
        <div className="h-[1px] bg-separator my-3" />
        <div className="py-8 text-center">
          <p className="text-subhead text-ink-2 mb-2">
            No certificate selected
          </p>
          <p className="text-footnote text-ink-3">
            Tap on a certificate below to set it as your study goal
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <span className="text-title-2">📚</span>
          <h3 className="text-title-3 font-semibold text-ink">Study Goal</h3>
        </div>
        <motion.button
          whileTap={TAP}
          onClick={onClear}
          className="text-footnote font-medium text-negative"
        >
          Clear
        </motion.button>
      </div>

      <div className="h-[1px] bg-separator my-3" />

      {/* Active Certificate Info */}
      <div className="bg-accent/5 rounded-xl p-4 mb-4">
        <p className="text-callout font-semibold text-ink mb-1">
          {certificate.name}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-caption-2 font-semibold px-2 py-0.5 rounded-lg bg-accent/15 text-accent">
            {certificate.level}
          </span>
          <span className="text-footnote text-ink-2">
            Target: {certificate.target}
          </span>
        </div>
      </div>

      {/* Did you study today prompt */}
      <p className="text-subhead font-medium text-ink-2 mb-2 text-center">
        Did you study today? 📖
      </p>

      <ClickableStreakGrid
        history={history}
        color="var(--color-accent)"
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
    <div className="bg-surface rounded-2xl p-5 shadow-card">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-title-2">{emoji}</span>
        <h3 className="text-title-3 font-semibold text-ink">{title}</h3>
      </div>
      <div className="h-[1px] bg-separator my-3" />

      {/* Weight Progress Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-subhead font-semibold text-ink">Weight</span>
            <span className="text-subhead text-ink-2">
              <span className="tabular-nums">{currentWeight}</span>kg
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-footnote text-ink-2">
              Goal <span className="tabular-nums">{goalWeight}</span>kg
            </span>
            <motion.button
              whileTap={TAP}
              onClick={onUpdateWeight}
              className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shadow-card"
            >
              <Plus size={16} className="text-white" strokeWidth={3} />
            </motion.button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-fill rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          />
        </div>

        <p className="text-subhead text-ink-2 mt-2">
          You lost{" "}
          <span className="font-semibold text-ink tabular-nums">
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
  } = useStudyGoal();

  // Protocol context for Learn Stuff integration
  const { markLearnStuffDone } = useProtocol();
  const haptic = useWebHaptics();

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

  // Certifications — global_data/certifications, synced across devices.
  // Only changes made on this device are written (the old version re-uploaded
  // both fields on every visit).
  const [customCertifications, setCustomCertifications] = useCustomCertifications();
  const [storedDomains, storeDomains] = useCertificationDomains();
  // Statuses are overlaid on the built-in catalog, so certifications added to
  // INITIAL_DOMAINS in code appear even when an older list is stored.
  const domains = useMemo(() => withStatuses(statusMap(storedDomains)), [storedDomains]);
  const setDomains = useCallback(
    (update) => storeDomains((prev) => {
      const current = withStatuses(statusMap(prev));
      return typeof update === "function" ? update(current) : update;
    }),
    [storeDomains],
  );

  // Extract current values from context
  const currentWeight = goals.exercise?.currentWeight || 120;
  const goalWeight = goals.exercise?.goalWeight || 90;

  // Wrapper for study toggle that also marks Learn Stuff done when studying today
  const handleStudyToggle = useCallback(
    (dateStr) => {
      toggleStudyDate(dateStr);

      // If toggling today to "studied", also mark Learn Stuff done
      if (dateStr === getPhDateKey()) {
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
    [toggleStudyDate, studyHistory, markLearnStuffDone]
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
    haptic.trigger("selection");
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
    haptic.trigger("light");
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
    <PageTransition className="min-h-screen bg-canvas pb-32">
      {/* Header */}
      <PageHeader title="Growth" subtitle="Goals & certifications" className="pb-2" />

      {/* Hero Progress Card */}
      <div className="px-5 mt-6 mb-4">
        <motion.div
          layoutId="growth-hero-card"
          onClick={() => setShowCalendarSheet(true)}
          whileTap={{ scale: 0.98 }}
          className="cursor-pointer relative overflow-hidden rounded-2xl p-5 bg-surface shadow-card"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-footnote font-semibold text-positive mb-1">
                {activeStudyGoal ? "Currently studying" : "Overall progress"}
              </p>
              <p className="text-title-2 font-bold text-ink">
                {activeStudyGoal ? activeStudyGoal.name : "No active goal"}
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
              color="var(--color-positive)"
            />
          </div>

          {activeStudyGoal && (
            <div className="mt-4 bg-accent/10 rounded-xl py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-caption">📚</span>
                  <p className="text-subhead font-semibold text-accent">
                    {activeStudyGoal.level} • Target: {activeStudyGoal.target}
                  </p>
                </div>
                {activeStudyGoal.vendor && (
                  <span className="text-caption-2 font-semibold px-2 py-0.5 rounded-lg bg-accent/15 text-accent">
                    {activeStudyGoal.vendor}
                  </span>
                )}
              </div>
            </div>
          )}

          {!activeStudyGoal && (
            <div className="mt-4 bg-positive/10 rounded-xl py-3 px-4">
              <p className="text-subhead font-semibold text-positive text-center">
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
              <span className="text-body">🎯</span>
            </div>
            <h2 className="text-title-3 font-semibold text-ink">
              Personal Goals
            </h2>
          </div>
          <motion.button
            whileTap={TAP}
            onClick={() => { haptic.trigger("medium"); setShowAddGoalSheet(true); }}
            className="w-8 h-8 rounded-full bg-[#8B5CF6] flex items-center justify-center shadow-card"
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
              className="w-10 h-10 rounded-xl flex items-center justify-center mr-3 bg-fill"
            >
              <span className="text-body">📜</span>
            </div>
            <h2 className="text-title-3 font-semibold text-ink">
              Certifications
            </h2>
          </div>
          <motion.button
            whileTap={TAP}
            onClick={() => { haptic.trigger("medium"); setShowAddCertSheet(true); }}
            className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-card"
          >
            <Plus size={18} strokeWidth={2.5} className="text-white" />
          </motion.button>
        </div>

        {/* Custom Certifications (if any) */}
        {customCertifications.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-callout">✨</span>
              <h3 className="text-subhead font-semibold text-ink-2">
                My Certifications
              </h3>
              <span className="text-caption text-ink-3 ml-auto">
                {
                  customCertifications.filter(
                    (c) => getEffectiveStatus(c) === "done"
                  ).length
                }
                /{customCertifications.length} complete
              </span>
            </div>
            <div className="bg-surface rounded-2xl overflow-hidden shadow-card">
              {customCertifications.map((cert, index) => (
                <CourseRow
                  key={cert.id}
                  item={cert}
                  isLast={index === customCertifications.length - 1}
                  color="var(--color-accent)"
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
                      <span className="text-callout">{subcat.icon}</span>
                      <h3 className="text-subhead font-semibold text-ink-2">
                        {subcat.name}
                      </h3>
                      <span className="text-caption text-ink-3 ml-auto">
                        {
                          subcat.modules.filter(
                            (m) => getEffectiveStatus(m) === "done"
                          ).length
                        }
                        /{subcat.modules.length} complete
                      </span>
                    </div>

                    {/* Subcategory Modules */}
                    <div className="bg-surface rounded-2xl overflow-hidden shadow-card">
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
              <div className="bg-surface rounded-2xl overflow-hidden shadow-card">
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
      <p className="text-center text-ink-3 text-caption-2 font-medium mt-10 mb-20">
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
