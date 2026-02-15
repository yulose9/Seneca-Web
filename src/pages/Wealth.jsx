import clsx from "clsx";
import {
  AnimatePresence,
  animate,
  useMotionValue,
} from "framer-motion";
import Fuse from "fuse.js";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AccountDetailSheet from "../components/AccountDetailSheet";
import AddTransactionSheet from "../components/AddTransactionSheet";
import { ReminderSettingsSheet } from "../components/ObligationReminder";
import PageTransition from "../components/PageTransition";
import TransactionDetailSheet from "../components/TransactionDetailSheet";
import {
  getGlobalData,
  saveGlobalDataLocal,
  subscribeToGlobalData,
  updateGlobalData,
  updateTodayLog,
} from "../services/dataLogger";

// LocalStorage keys for Wealth data
const WEALTH_STORAGE_KEYS = {
  ASSETS: "wealth_assets",
  LIABILITIES: "wealth_liabilities",
  TRANSACTIONS: "wealth_transactions",
  SEARCH_HISTORY: "wealth_search_history",
};

// Default data (amounts are 0 — real values come from Firestore)
const DEFAULT_ASSETS = [
  {
    id: "maribank",
    icon: "🏦",
    name: "MariBank",
    platform: "SeaMoney",
    amount: 0,
    value: 0,
    change: 0,
    isPositive: true,
    category: "Savings",
  },
  {
    id: "emergency",
    icon: "🚨",
    name: "Emergency Fund",
    platform: "Emergency Fund",
    amount: 0,
    value: 0,
    change: 0,
    isPositive: true,
    category: "Savings",
  },
  {
    id: "trading212",
    icon: "📈",
    name: "Trading212",
    platform: "AI Growth Stocks",
    amount: 0,
    value: 0,
    change: 0,
    isPositive: true,
    category: "Investments",
  },
  {
    id: "gcash",
    icon: "💳",
    name: "GCash",
    platform: "Digital Wallet",
    amount: 0,
    value: 0,
    change: 0,
    isPositive: true,
    category: "Savings",
  },
];

const DEFAULT_LIABILITIES = [
  {
    id: "kuya",
    icon: "�",
    name: "Loan from Kuya",
    platform: "Personal",
    amount: 0,
    value: 0,
    category: "Liabilities",
    isPriority: true,
    tags: ["Personal", "Priority"],
  },
  {
    id: "other",
    icon: "🍀",
    name: "Other Loans",
    platform: "Bank / Other",
    amount: 0,
    value: 0,
    category: "Liabilities",
    isPriority: false,
    tags: ["Bank"],
  },
];

const DEFAULT_TRANSACTIONS = [];

// Hydrate a liability from cloud data by restoring missing fields from defaults
const hydrateLiability = (cloudLiability) => {
  const defaults = DEFAULT_LIABILITIES.find((d) => d.id === cloudLiability.id);
  if (defaults) {
    return { ...defaults, ...cloudLiability, category: "Liabilities" };
  }
  // Unknown liability — ensure category is present
  return {
    icon: "🏦",
    category: "Liabilities",
    value: 0,
    ...cloudLiability,
  };
};

// Load from localStorage helpers — no defaults, data comes from Firestore
const loadAssets = () => {
  try {
    const saved = localStorage.getItem(WEALTH_STORAGE_KEYS.ASSETS);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const loadLiabilities = () => {
  try {
    const saved = localStorage.getItem(WEALTH_STORAGE_KEYS.LIABILITIES);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const loadTransactions = () => {
  try {
    const saved = localStorage.getItem(WEALTH_STORAGE_KEYS.TRANSACTIONS);
    return saved ? JSON.parse(saved) : DEFAULT_TRANSACTIONS;
  } catch {
    return DEFAULT_TRANSACTIONS;
  }
};

const loadSearchHistory = () => {
  try {
    const saved = localStorage.getItem(WEALTH_STORAGE_KEYS.SEARCH_HISTORY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Rolling Number Component
const RollingNumber = ({ value, prefix = "", className }) => {
  const ref = useRef(null);
  const motionValue = useMotionValue(value);

  useEffect(() => {
    if (value === undefined || value === null) return;
    const controls = animate(motionValue, value, {
      duration: 0.8,
      ease: [0.32, 0.72, 0, 1], // Custom efficient ease
      onUpdate: (latest) => {
        if (ref.current) {
          ref.current.textContent = `${prefix}${Math.round(
            latest,
          ).toLocaleString()}`;
        }
      },
    });
    return () => controls.stop();
  }, [value, motionValue, prefix]);

  if (value === undefined || value === null) return <span>{prefix}0</span>;

  return (
    <span ref={ref} className={className}>
      {prefix}
      {(value || 0).toLocaleString()}
    </span>
  );
};

// Confirmation Dialog Component
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Delete",
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed left-4 right-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl overflow-hidden z-[301] max-w-sm mx-auto shadow-2xl"
        >
          <div className="p-6 text-center">
            <h3 className="text-[17px] font-semibold text-black mb-2">
              {title}
            </h3>
            <p className="text-[15px] text-[rgba(60,60,67,0.6)]">{message}</p>
          </div>
          <div className="border-t border-[rgba(60,60,67,0.12)] flex">
            <motion.button
              whileTap={{ backgroundColor: "rgba(0,0,0,0.05)" }}
              onClick={onClose}
              className="flex-1 py-4 text-[17px] font-medium text-[#007AFF] border-r border-[rgba(60,60,67,0.12)]"
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ backgroundColor: "rgba(0,0,0,0.05)" }}
              onClick={onConfirm}
              className="flex-1 py-4 text-[17px] font-semibold text-[#FF3B30]"
            >
              {confirmText}
            </motion.button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// Swipeable Row Logic (HOC or enhanced component)
const SwipeableRow = ({
  children,
  onSwipeDelete,
  onSelect,
  onClick,
  isSelecting,
  isSelected,
  item,
  onLongPress,
}) => {
  const [showDelete, setShowDelete] = useState(false);
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  const handleTouchStart = (e) => {
    isLongPress.current = false;
    if (!isSelecting) {
      e.currentTarget.dataset.startX = e.touches[0].clientX;
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        onLongPress?.(item.id);
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    }
  };

  const handleTouchMove = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!isSelecting && e.currentTarget.dataset.startX) {
      const diff =
        e.touches[0].clientX - parseFloat(e.currentTarget.dataset.startX);
      if (diff < -50) setShowDelete(true);
      if (diff > 50) setShowDelete(false);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    if (isSelecting) {
      onSelect(item.id);
    } else if (!showDelete) {
      onClick?.(item);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence>
        {showDelete && !isSelecting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="absolute right-2 top-2 bottom-2 z-10 flex w-[70px]"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSwipeDelete(item);
                setShowDelete(false);
              }}
              className="w-full h-full bg-[#FF3B30] text-white rounded-xl font-semibold flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            >
              <Trash2 size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ x: showDelete ? -80 : 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className={clsx(
          "bg-white active:bg-black/[0.02] transition-colors relative z-0",
          isSelecting && "pl-12",
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {/* Selection Checkbox */}
        <AnimatePresence>
          {isSelecting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: -20 }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20"
            >
              <div
                className={clsx(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                  isSelected
                    ? "bg-[#007AFF] border-[#007AFF]"
                    : "border-[rgba(60,60,67,0.3)] bg-transparent",
                )}
              >
                {isSelected && (
                  <Check size={14} className="text-white" strokeWidth={3} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {children}
      </motion.div>
    </div>
  );
};

// AssetRow (Phantom-style)
const AssetRow = (props) => (
  <SwipeableRow {...props} item={props} onSwipeDelete={props.onDelete}>
    <div className="flex items-center p-4 cursor-pointer">
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center text-xl mr-3 shrink-0">
        {props.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-semibold text-black truncate">
          {props.name}
        </p>
        <p className="text-[13px] text-[rgba(60,60,67,0.6)]">
          {props.platform}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[16px] font-bold text-black">
          ₱{(props.amount || 0).toLocaleString()}
        </p>
        {props.change !== undefined && (
          <p
            className={clsx(
              "text-[13px] font-semibold",
              props.isPositive ? "text-[#34C759]" : "text-[#FF3B30]",
            )}
          >
            {props.isPositive ? "+" : "-"}₱
            {Math.abs(props.change || 0).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  </SwipeableRow>
);

// LiabilityRow
const LiabilityRow = (props) => (
  <SwipeableRow {...props} item={props} onSwipeDelete={props.onDelete}>
    <div
      className={`flex items-center p-4 cursor-pointer ${
        props.isPriority ? "bg-[#FF3B30]/5" : ""
      }`}
    >
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center text-xl mr-3 shrink-0 ${
          props.isPriority ? "bg-[#FF3B30]/20" : "bg-[#FF3B30]/10"
        }`}
      >
        {props.icon}
      </div>
      <div className="flex-1">
        <p className="text-[16px] font-semibold text-black">{props.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {(props.tags || []).map((tag) => (
            <span
              key={tag}
              className={clsx(
                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                tag === "Priority"
                  ? "bg-[#FF3B30] text-white"
                  : "bg-black/[0.06] text-black/50",
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <p className="text-[16px] font-bold text-[#FF3B30]">
        -₱{(props.amount || 0).toLocaleString()}
      </p>
    </div>
  </SwipeableRow>
);

// Transaction Row (Swipeable & Selectable)
const TransactionRow = ({
  item,
  isLast,
  isSelecting,
  isSelected,
  onSelect,
  onDelete,
  onLongPress,
  onClick,
  ...props
}) => {
  const [showDelete, setShowDelete] = useState(false);
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  const handleTouchStart = (e) => {
    isLongPress.current = false;
    if (!isSelecting) {
      e.currentTarget.dataset.startX = e.touches[0].clientX;
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        onLongPress?.(item.id);
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    }
  };

  const handleTouchMove = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!isSelecting && e.currentTarget.dataset.startX) {
      const diff =
        e.touches[0].clientX - parseFloat(e.currentTarget.dataset.startX);
      if (diff < -50) setShowDelete(true);
      if (diff > 50) setShowDelete(false);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    if (isSelecting) {
      onSelect(item.id);
    } else if (!showDelete) {
      onClick?.(item);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div
        className={clsx(
          "absolute right-2 top-2 bottom-2 w-[70px] flex items-center justify-center transition-transform duration-200",
          showDelete ? "translate-x-0" : "translate-x-full",
        )}
      >
        <button
          onClick={() => onDelete(item.id)}
          className="w-full h-full bg-[#FF3B30] text-white rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <motion.div
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        whileTap={!isSelecting && !showDelete ? { scale: 0.98 } : undefined}
        className={clsx(
          "flex items-center p-4 bg-white border border-black/[0.04] relative transition-transform duration-200 select-none",
          !isLast ? "border-b-0" : "",
          showDelete && "-translate-x-20",
        )}
        style={{ borderRadius: "12px", marginBottom: "8px" }}
      >
        <AnimatePresence>
          {isSelecting && (
            <motion.div
              initial={{ width: 0, opacity: 0, marginRight: 0 }}
              animate={{ width: 28, opacity: 1, marginRight: 12 }}
              exit={{ width: 0, opacity: 0, marginRight: 0 }}
              className="shrink-0 overflow-hidden"
            >
              <div
                className={clsx(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                  isSelected
                    ? "bg-[#007AFF] border-[#007AFF]"
                    : "border-[rgba(60,60,67,0.3)]",
                )}
              >
                {isSelected && (
                  <Check size={14} className="text-white" strokeWidth={3} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-10 h-10 rounded-full border-2 border-[rgba(60,60,67,0.2)] flex items-center justify-center mr-3 shrink-0">
          {item.type === "deposit" || item.type === "payment" ? (
            <ArrowDownLeft size={18} className="text-[#34C759]" />
          ) : (
            <ArrowUpRight size={18} className="text-[#FF3B30]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold text-black flex items-center">
            <span
              onClick={(e) => {
                if (props.onAccountClick && !isSelecting) {
                  e.stopPropagation();
                  props.onAccountClick(item);
                }
              }}
              className={
                props.onAccountClick && !isSelecting
                  ? "hover:underline cursor-pointer active:text-[#007AFF] transition-colors"
                  : ""
              }
            >
              {item.bank}
            </span>
          </p>
          <p className="text-[13px] text-[rgba(60,60,67,0.6)] truncate">
            {item.note || item.location}
          </p>
        </div>
        <div className="text-right">
          <p
            className={clsx(
              "text-[17px] font-bold",
              item.type === "deposit" || item.type === "payment"
                ? "text-black"
                : "text-[#FF3B30]",
            )}
          >
            {item.type === "withdrawal" && "-"}₱
            {(item.amount || 0).toLocaleString()}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// Category Dropdown
const CategoryDropdown = ({
  selected,
  options,
  onSelect,
  isOpen,
  setIsOpen,
}) => (
  <div className="relative z-50">
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => setIsOpen(!isOpen)}
      className="flex items-center gap-2 text-white/90 font-semibold text-[15px]"
    >
      {selected}
      <ChevronDown
        size={18}
        className={clsx("transition-transform", isOpen && "rotate-180")}
      />
    </motion.button>

    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-black/[0.06] overflow-hidden min-w-[140px] z-[100]"
        >
          {options.map((option) => (
            <motion.button
              key={option}
              whileTap={{ backgroundColor: "rgba(0,0,0,0.04)" }}
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
              className={clsx(
                "w-full px-4 py-3 text-left text-[15px] font-medium",
                selected === option
                  ? "text-[#007AFF] bg-[#007AFF]/5"
                  : "text-black",
              )}
            >
              {option}
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default function Wealth() {
  // Interaction timestamp to prevent "Cloud Echo" overwrites
  const lastLocalInteraction = useRef(0);

  // 🛡️ MOUNT PROTECTION: Prevents new devices from overwriting cloud data
  const mountTimestamp = useRef(Date.now());
  const MOUNT_PROTECTION_DURATION = 3000; // 3 seconds

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("category") || "All Assets";

  const setSelectedCategory = (category) => {
    setSearchParams({ category });
  };

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [viewTransaction, setViewTransaction] = useState(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showReminderSettings, setShowReminderSettings] = useState(false);

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");

  const FILTER_OPTIONS = [
    { id: "All", label: "All" },
    { id: "deposit", label: "Income", icon: <ArrowDownLeft size={13} /> },
    { id: "withdrawal", label: "Expenses", icon: <ArrowUpRight size={13} /> },
    { id: "has_location", label: "Places", icon: <MapPin size={13} /> },
    {
      id: "high_value",
      label: "High Value (>₱1k)",
      icon: <div className="text-[10px] font-bold">₱₱</div>,
    }, // Custom icon
    {
      id: "recent",
      label: "Recent",
      icon: <div className="w-1.5 h-1.5 rounded-full bg-current" />,
    },
  ];

  // Transaction selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: null,
    itemId: null,
  });

  const categories = ["All Assets", "Savings", "Investments", "Liabilities"];

  // State for Accounts - loaded from localStorage
  const [assets, setAssets] = useState(loadAssets);
  const [liabilities, setLiabilities] = useState(loadLiabilities);
  const [transactions, setTransactions] = useState(loadTransactions);
  const [searchHistory, setSearchHistory] = useState(loadSearchHistory); // New State

  // Persist to localStorage whenever data changes (skip the very first render with defaults)
  const saveGuardRef = useRef(false);
  useEffect(() => {
    // Allow saves after first cloud fetch or after a short delay
    const timer = setTimeout(() => {
      saveGuardRef.current = true;
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!saveGuardRef.current) return;
    localStorage.setItem(WEALTH_STORAGE_KEYS.ASSETS, JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    if (!saveGuardRef.current) return;
    localStorage.setItem(
      WEALTH_STORAGE_KEYS.LIABILITIES,
      JSON.stringify(liabilities),
    );
  }, [liabilities]);

  useEffect(() => {
    if (!saveGuardRef.current) return;
    localStorage.setItem(
      WEALTH_STORAGE_KEYS.TRANSACTIONS,
      JSON.stringify(transactions),
    );
  }, [transactions]);

  useEffect(() => {
    if (!saveGuardRef.current) return;
    localStorage.setItem(
      WEALTH_STORAGE_KEYS.SEARCH_HISTORY,
      JSON.stringify(searchHistory),
    );
  }, [searchHistory]);

  // 🔄 INITIAL CLOUD FETCH on mount - Get global wealth data
  useEffect(() => {
    const fetchGlobalWealth = async () => {
      try {
        const cloudWealth = await getGlobalData("wealth");
        if (cloudWealth) {
          console.log("[Wealth] ✓ Loaded global data from Firestore");

          // Restore assets
          if (
            Array.isArray(cloudWealth.assets) &&
            cloudWealth.assets.length > 0
          ) {
            setAssets(cloudWealth.assets);
            localStorage.setItem(
              WEALTH_STORAGE_KEYS.ASSETS,
              JSON.stringify(cloudWealth.assets),
            );
          }

          // Restore liabilities
          if (
            Array.isArray(cloudWealth.liabilities) &&
            cloudWealth.liabilities.length > 0
          ) {
            const hydrated = cloudWealth.liabilities.map(hydrateLiability);
            setLiabilities(hydrated);
            localStorage.setItem(
              WEALTH_STORAGE_KEYS.LIABILITIES,
              JSON.stringify(hydrated),
            );
          }

          // Restore transactions
          if (
            Array.isArray(cloudWealth.transactions) &&
            cloudWealth.transactions.length > 0
          ) {
            setTransactions(cloudWealth.transactions);
            localStorage.setItem(
              WEALTH_STORAGE_KEYS.TRANSACTIONS,
              JSON.stringify(cloudWealth.transactions),
            );
          }

          // Restore search history
          if (Array.isArray(cloudWealth.search_history)) {
            setSearchHistory(cloudWealth.search_history);
            localStorage.setItem(
              WEALTH_STORAGE_KEYS.SEARCH_HISTORY,
              JSON.stringify(cloudWealth.search_history),
            );
          }

          // Enable localStorage saves now that we have real data
          saveGuardRef.current = true;
        } else {
          // No Firestore data yet — seed with defaults if localStorage is also empty
          console.log(
            "[Wealth] No Firestore data found, seeding defaults if needed",
          );
          setAssets((prev) => (prev.length > 0 ? prev : DEFAULT_ASSETS));
          setLiabilities((prev) =>
            prev.length > 0 ? prev : DEFAULT_LIABILITIES,
          );
          saveGuardRef.current = true;
        }
      } catch (error) {
        console.error("[Wealth] Failed to fetch global data:", error);
      }
    };

    fetchGlobalWealth();
  }, []); // Run once on mount

  // 🌐 Sync WEALTH DATA to GLOBAL storage (persists across days)
  useEffect(() => {
    // 🛡️ MOUNT PROTECTION: Don't sync to Firestore during initial load
    const timeSinceMount = Date.now() - mountTimestamp.current;
    if (timeSinceMount < MOUNT_PROTECTION_DURATION) {
      console.log("[Wealth] Mount protection active, skipping Firestore WRITE");
      return;
    }

    // Only sync after user has actually interacted
    if (lastLocalInteraction.current === 0) {
      console.log("[Wealth] No user interaction yet, skipping Firestore WRITE");
      return;
    }

    const syncTimer = setTimeout(() => {
      console.log(
        "[Wealth] Syncing to GLOBAL Firestore (persists across days)...",
      );
      const totalAssets = assets.reduce((sum, a) => sum + (a.amount || 0), 0);
      const totalLiabilities = liabilities.reduce(
        (sum, l) => sum + (l.amount || 0),
        0,
      );
      const netWorth = totalAssets - totalLiabilities;

      // Calculate spending by category
      const spendingByCategory = transactions
        .filter((t) => t.type === "withdrawal")
        .reduce((acc, t) => {
          const cat = t.category || "Other";
          acc[cat] = (acc[cat] || 0) + t.amount;
          return acc;
        }, {});

      // 🌐 GLOBAL DATA: Save to global_data/wealth (persists across days!)
      updateGlobalData("wealth", {
        assets: assets.map((a) => ({
          ...a,
          amount: a.amount,
        })),
        liabilities: liabilities.map((l) => ({
          ...l,
          amount: l.amount,
        })),
        transactions: transactions, // ALL transactions
        search_history: searchHistory,
        net_worth: netWorth,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        spending_by_category: spendingByCategory,
      });

      // Also save to localStorage for offline access
      saveGlobalDataLocal("wealth", {
        assets,
        liabilities,
        transactions,
        searchHistory,
      });

      // Daily log: Just summary for analytics
      const today = new Date().toISOString().split("T")[0];
      const todayTransactions = transactions.filter(
        (t) => t.date && t.date.split("T")[0] === today,
      );
      updateTodayLog("wealth", {
        net_worth: netWorth,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        transactions_today: todayTransactions.length,
        spending_by_category: spendingByCategory,
      });
    }, 1000); // 1 second debounce

    return () => clearTimeout(syncTimer);
  }, [assets, liabilities, transactions, searchHistory]);

  // 🚀 REAL-TIME CLOUD SYNC (Incoming) - Listen to GLOBAL wealth data
  useEffect(() => {
    const unsubscribe = subscribeToGlobalData("wealth", (cloudWealth) => {
      // 🛡️ MOUNT PROTECTION: Skip cloud updates for first 3 seconds after page load
      const timeSinceMount = Date.now() - mountTimestamp.current;
      if (timeSinceMount < MOUNT_PROTECTION_DURATION) {
        console.log("[Wealth] Mount protection active, skipping cloud sync");
        return;
      }

      // Throttle: Ignore cloud updates if user just interacted locally (<2s)
      if (Date.now() - lastLocalInteraction.current < 2000) return;

      if (!cloudWealth) return;

      console.log("[Wealth] Received global data from cloud");

      const {
        assets: cloudAssets,
        liabilities: cloudLiabilities,
        transactions: cloudTransactions,
        search_history: cloudSearchHistory,
      } = cloudWealth;

      // 1. Transactions - Union by ID
      if (Array.isArray(cloudTransactions)) {
        setTransactions((prev) => {
          const cloud = cloudTransactions;
          const merged = [...cloud];

          prev.forEach((localItem) => {
            if (!merged.find((c) => c.id === localItem.id)) {
              merged.push(localItem);
            }
          });

          merged.sort((a, b) => new Date(b.date) - new Date(a.date));
          if (JSON.stringify(merged) === JSON.stringify(prev)) return prev;
          return merged;
        });
      }

      // 2. Assets - Update existing, Add new from cloud, Keep local-only
      if (Array.isArray(cloudAssets)) {
        setAssets((prev) => {
          const cloud = cloudAssets;
          const merged = [...prev];
          let hasChanges = false;

          cloud.forEach((cloudItem) => {
            const index = merged.findIndex((p) => p.id === cloudItem.id);
            if (index !== -1) {
              if (JSON.stringify(merged[index]) !== JSON.stringify(cloudItem)) {
                merged[index] = cloudItem;
                hasChanges = true;
              }
            } else {
              merged.push(cloudItem);
              hasChanges = true;
            }
          });

          if (!hasChanges && prev.length === merged.length) return prev;
          return merged;
        });
      }

      // 3. Liabilities — merge with hydration to restore missing fields
      if (Array.isArray(cloudLiabilities)) {
        setLiabilities((prev) => {
          const cloud = cloudLiabilities;
          const merged = [...prev];
          let hasChanges = false;

          cloud.forEach((cloudItem) => {
            const hydrated = hydrateLiability(cloudItem);
            const index = merged.findIndex((p) => p.id === cloudItem.id);
            if (index !== -1) {
              // Merge: keep local fields, update with cloud data
              const mergedItem = { ...merged[index], ...hydrated };
              if (
                JSON.stringify(merged[index]) !== JSON.stringify(mergedItem)
              ) {
                merged[index] = mergedItem;
                hasChanges = true;
              }
            } else {
              merged.push(hydrated);
              hasChanges = true;
            }
          });

          if (!hasChanges && prev.length === merged.length) return prev;
          return merged;
        });
      }

      // 4. Search History
      if (Array.isArray(cloudSearchHistory)) {
        setSearchHistory((prev) => {
          const cloud = cloudSearchHistory;
          const newHistory = [...prev];
          let hasChanges = false;

          cloud.forEach((item) => {
            if (!newHistory.includes(item)) {
              newHistory.push(item);
              hasChanges = true;
            }
          });

          if (!hasChanges) return prev;
          return newHistory.slice(0, 10);
        });
      }
    });

    return () => unsubscribe();
  }, [assets, liabilities, transactions, searchHistory]); // Dependencies for comparison

  const handleSaveSearch = () => {
    if (searchQuery.trim().length > 0) {
      setSearchHistory((prev) => {
        const newHistory = [
          searchQuery,
          ...prev.filter((s) => s !== searchQuery),
        ].slice(0, 10); // Keep last 10 unique
        return newHistory;
      });
    }
  };

  const handleDeleteAsset = (asset) => {
    // Step 1: Initial Warning
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${asset.name}?`,
      message:
        "This is a real ASSET. Deleting it will remove the account and all history.",
      confirmText: "Continue",
      onConfirm: () => {
        // Step 2: Final Confirmation
        setConfirmDialog({
          isOpen: true,
          title: `Are you absolutely sure?`,
          message: `This action cannot be undone. ${asset.name} will be permanently removed.`,
          confirmText: "Delete Asset",
          onConfirm: () => {
            lastLocalInteraction.current = Date.now(); // Mark interaction time
            setAssets((prev) => prev.filter((a) => a.id !== asset.id));
            setConfirmDialog({ isOpen: false, type: null, itemId: null });
          },
        });
      },
    });
  };

  const handleDeleteLiability = (liability) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${liability.name}?`,
      message: "This will remove this liability record.",
      onConfirm: () => {
        lastLocalInteraction.current = Date.now(); // Mark interaction time
        setLiabilities((prev) => prev.filter((l) => l.id !== liability.id));
        setConfirmDialog({ isOpen: false, type: null, itemId: null });
      },
    });
  };

  // Account Viewing State
  const [viewingAccount, setViewingAccount] = useState(null);
  const [highlightTransactionId, setHighlightTransactionId] = useState(null);

  const handleAssetClick = (asset) => {
    setViewingAccount(asset);
    setHighlightTransactionId(null);
  };

  const handleLiabilityClick = (liability) => {
    setViewingAccount(liability);
    setHighlightTransactionId(null);
  };

  const handleTransactionAccountClick = (transaction) => {
    const matchedAccount = [...assets, ...liabilities].find(
      (a) => a.name === transaction.bank,
    );
    if (matchedAccount) {
      setViewingAccount(matchedAccount);
      setHighlightTransactionId(transaction.id);
    }
  };

  // Helper for Relative Dates
  const getRelativeHeader = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const dateFormatted = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    if (diffDays === 0 && date.getDate() === now.getDate())
      return `Today, ${dateFormatted}`;
    if (diffDays === 1) return `Yesterday, ${dateFormatted}`;
    if (diffDays === 3) return `Three Days Ago, ${dateFormatted}`;
    if (diffDays <= 7) return `A Week Ago, ${dateFormatted}`;
    if (diffDays <= 30) return `A Month Ago, ${dateFormatted}`;
    return dateFormatted;
  };

  // Configure Fuse.js
  const fuse = useMemo(() => {
    const enrichedTransactions = transactions.map((t) => ({
      ...t,
      dateLocal: new Date(t.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      dateRelative: getRelativeHeader(t.date),
    }));

    return new Fuse(enrichedTransactions, {
      keys: [
        { name: "bank", weight: 0.7 },
        { name: "location", weight: 0.5 },
        { name: "amount", weight: 0.3 },
        { name: "dateLocal", weight: 0.4 },
        { name: "dateRelative", weight: 0.6 },
        { name: "type", weight: 0.2 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
    });
  }, [transactions]);

  // Combined Search Logic
  const filteredSearchResults = useMemo(() => {
    let results = transactions;

    // 1. Text Search (if any)
    if (searchQuery.length > 0) {
      results = fuse.search(searchQuery).map((r) => r.item);
    }

    // 2. Category Filter
    if (activeFilter !== "All") {
      if (activeFilter === "recent") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        results = results.filter((t) => new Date(t.date) >= oneWeekAgo);
      } else if (activeFilter === "has_location") {
        // Filter for transactions with specific locations (ignoring generic ones)
        results = results.filter(
          (t) =>
            t.location &&
            !["Payment", "Interest", "Deposit", "Transfer"].includes(
              t.location,
            ),
        );
      } else if (activeFilter === "high_value") {
        results = results.filter((t) => t.amount > 1000);
      } else {
        results = results.filter((t) => t.type === activeFilter);
      }
    }

    return results;
  }, [searchQuery, activeFilter, transactions, fuse]);

  useEffect(() => {
    // Only update search results if searching
    if (isSearching) {
      setSearchResults(filteredSearchResults);
    }
  }, [filteredSearchResults, isSearching]);

  // Group transactions (standard view)
  const groupedTransactions = useMemo(() => {
    let filtered = transactions;

    if (selectedCategory === "Liabilities") {
      filtered = transactions.filter((t) => t.category === "Liabilities");
    } else if (selectedCategory !== "All Assets") {
      const categoryAssets = assets.filter(
        (a) => a.category === selectedCategory,
      );
      const assetNames = categoryAssets.map((a) => a.name);

      filtered = transactions.filter(
        (t) => t.category === selectedCategory || assetNames.includes(t.bank),
      );
    }

    return filtered.reduce((groups, transaction) => {
      const header = getRelativeHeader(transaction.date);
      if (!groups[header]) groups[header] = [];
      groups[header].push(transaction);
      return groups;
    }, {});
  }, [transactions, selectedCategory, assets]);

  // Transaction Actions
  const handleSelect = (id) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };
  const handleDeleteSingle = (id) =>
    setConfirmDialog({ isOpen: true, type: "single", itemId: id });
  const handleDeleteSelected = () => {
    if (selectedIds.size > 0)
      setConfirmDialog({ isOpen: true, type: "bulk", itemId: null });
  };
  const handleConfirmDelete = () => {
    lastLocalInteraction.current = Date.now(); // Mark interaction time

    if (confirmDialog.type === "single")
      setTransactions((prev) =>
        prev.filter((t) => t.id !== confirmDialog.itemId),
      );
    else {
      setTransactions((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
      setIsSelecting(false);
    }
    setConfirmDialog({ isOpen: false, type: null, itemId: null });
  };
  const handleSelectAll = () =>
    setSelectedIds(
      selectedIds.size === transactions.length
        ? new Set()
        : new Set(transactions.map((t) => t.id)),
    );
  const handleLongPress = (id) => {
    setIsSelecting(true);
    setSelectedIds(new Set([id]));
  };

  const handleUpdateBalance = (account, newBalance) => {
    lastLocalInteraction.current = Date.now(); // Mark interaction time

    const diff = newBalance - account.amount;
    if (diff === 0) return;

    const isPositive = diff > 0;
    const amount = Math.abs(diff);

    // Determine if this is a liability by checking the liabilities array
    // (more reliable than account.category which may be stripped by cloud sync)
    const isLiability = liabilities.some((l) => l.id === account.id);

    // Update Account Balance in State
    if (isLiability) {
      setLiabilities((prev) =>
        prev.map((l) =>
          l.id === account.id ? { ...l, amount: newBalance } : l,
        ),
      );
    } else {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === account.id ? { ...a, amount: newBalance } : a,
        ),
      );
    }

    // Auto-generate transaction
    const type = isLiability
      ? isPositive
        ? "withdrawal"
        : "deposit" // Debt up = withdrawal from net worth, Debt down = deposit to net worth
      : isPositive
        ? "deposit"
        : "withdrawal";

    const transaction = {
      id: Date.now(),
      date: new Date().toISOString(),
      amount: amount,
      type: type,
      category: isLiability ? "Liabilities" : account.category,
      bank: account.name,
      note: "Balance Adjustment",
      location: "Manual Edit",
    };

    handleAddTransaction(transaction);
    setViewingAccount((prev) => ({ ...prev, amount: newBalance }));
  };

  const handleAddTransaction = (transaction) => {
    lastLocalInteraction.current = Date.now(); // Mark interaction time
    setTransactions((prev) => [transaction, ...prev]);
    console.log("New transaction added:", transaction);
  };

  const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Calculate this month's activity from actual transactions
  // Calculate this month's activity from actual transactions, filtered by category
  const thisMonthTransactions = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let relevantTransactions = transactions;

    if (selectedCategory === "Savings") {
      const savingsBanks = assets
        .filter((a) => a.category === "Savings")
        .map((a) => a.name);
      relevantTransactions = transactions.filter((t) =>
        savingsBanks.includes(t.bank),
      );
    } else if (selectedCategory === "Investments") {
      const investmentBanks = assets
        .filter((a) => a.category === "Investments")
        .map((a) => a.name);
      relevantTransactions = transactions.filter((t) =>
        investmentBanks.includes(t.bank),
      );
    } else if (selectedCategory === "Liabilities") {
      // Assuming liabilities logic (if transactions were linked, for now maybe just withdrawals?)
      // Or maybe we don't show "income/expense" for liabilities in the same way?
      // For now, let's keep it consistent or empty if no transactions map.
      relevantTransactions = [];
    }

    return relevantTransactions.filter((t) => new Date(t.date) >= startOfMonth);
  }, [transactions, selectedCategory, assets]);

  const monthlyDeposits = thisMonthTransactions
    .filter((t) => t.type === "deposit")
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyWithdrawals = thisMonthTransactions
    .filter((t) => t.type === "withdrawal")
    .reduce((sum, t) => sum + t.amount, 0);
  const filteredAssets =
    selectedCategory === "All Assets"
      ? assets
      : selectedCategory === "Liabilities"
        ? []
        : assets.filter((a) => a.category === selectedCategory);

  const filteredLiabilities =
    selectedCategory === "All Assets" || selectedCategory === "Liabilities"
      ? liabilities
      : [];

  const displayedBalance =
    selectedCategory === "Liabilities"
      ? totalLiabilities
      : selectedCategory === "All Assets"
        ? netWorth
        : filteredAssets.reduce((sum, a) => sum + a.amount, 0);

  return (
    <PageTransition className="min-h-screen bg-[#F2F2F7] pb-32">
      {/* Phantom-style Dark Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        layout
        className="relative z-20"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f2419] via-[#132e1f] to-[#1a3d2a]" />

        <div className="relative pt-[calc(3.5rem+env(safe-area-inset-top))] pb-4 px-5">
          {/* Header: Search vs Normal */}
          <div
            className={clsx(
              "flex items-center justify-between mb-4",
              isSearching ? "gap-2" : "mb-8",
            )}
          >
            {!isSearching ? (
              <>
                <CategoryDropdown
                  selected={selectedCategory}
                  options={categories}
                  onSelect={setSelectedCategory}
                  isOpen={isDropdownOpen}
                  setIsOpen={setIsDropdownOpen}
                />
                <div className="flex items-center gap-3">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAddSheet(true)}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <Plus size={20} className="text-white" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowReminderSettings(true)}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative"
                  >
                    <Bell size={20} className="text-white" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsSearching(true)}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <Search size={20} className="text-white" />
                  </motion.button>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 flex items-center gap-3"
              >
                <div className="flex-1 relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
                  />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search date, place, amount..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveSearch()}
                    className="w-full bg-white/10 text-white placeholder-white/50 rounded-xl pl-10 pr-10 py-2.5 outline-none focus:bg-white/20 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <div className="bg-white/20 rounded-full p-0.5">
                        <X size={12} className="text-white" />
                      </div>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setIsSearching(false);
                    setSearchQuery("");
                    setActiveFilter("All");
                  }}
                  className="text-white font-medium"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </div>

          {/* Dynamic Filters - Only visible when searching */}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-x-auto no-scrollbar -mx-5 px-5 pb-2"
              >
                <div className="flex items-center gap-2">
                  {FILTER_OPTIONS.map((filter, index) => (
                    <motion.button
                      key={filter.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setActiveFilter(filter.id)}
                      className={clsx(
                        "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all",
                        activeFilter === filter.id
                          ? "bg-white text-[#1e3a2f] shadow-md shadow-black/10 scale-105"
                          : "bg-white/10 text-white/80 hover:bg-white/15",
                      )}
                    >
                      {filter.icon && <span>{filter.icon}</span>}
                      {filter.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Balance Display (Hidden in Search Mode to reduce noise) */}
          {!isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center mb-6"
            >
              <div
                className={clsx(
                  "text-[48px] font-bold tracking-tight",
                  displayedBalance >= 0
                    ? "bg-gradient-to-br from-[#86EFAC] to-[#22C55E] bg-clip-text text-transparent"
                    : "text-[#FF6B6B]",
                )}
              >
                <RollingNumber
                  value={Math.abs(displayedBalance)}
                  prefix={displayedBalance < 0 ? "-₱" : "₱"}
                />
              </div>
              {selectedCategory !== "Liabilities" &&
                thisMonthTransactions.length > 0 && (
                  <div className="flex items-center justify-center gap-3 mt-2">
                    {monthlyDeposits > 0 && (
                      <div className="flex items-center gap-1">
                        <ArrowDownLeft size={14} className="text-[#4ADE80]" />
                        <span className="text-[#4ADE80] text-[14px] font-semibold">
                          <RollingNumber value={monthlyDeposits} prefix="₱" />
                        </span>
                      </div>
                    )}
                    {monthlyWithdrawals > 0 && (
                      <div className="flex items-center gap-1">
                        <ArrowUpRight size={14} className="text-[#FF6B6B]" />
                        <span className="text-[#FF6B6B] text-[14px] font-semibold">
                          <RollingNumber
                            value={monthlyWithdrawals}
                            prefix="₱"
                          />
                        </span>
                      </div>
                    )}
                    <span className="text-white/50 text-[12px]">
                      this month
                    </span>
                  </div>
                )}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Main Content Area */}
      {!isSearching ? (
        <>
          {/* Standard View */}
          <AnimatePresence>
            {isSelecting && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-5 mt-4 overflow-hidden"
              >
                <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-black/[0.04] shadow-sm">
                  <button
                    onClick={handleSelectAll}
                    className="text-[15px] font-medium text-[#007AFF]"
                  >
                    {selectedIds.size === transactions.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[rgba(60,60,67,0.6)]">
                      {selectedIds.size} selected
                    </span>
                    <button
                      onClick={handleDeleteSelected}
                      disabled={selectedIds.size === 0}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-[15px] font-semibold transition-colors",
                        selectedIds.size > 0
                          ? "bg-[#FF3B30] text-white"
                          : "bg-[rgba(120,120,128,0.12)] text-[rgba(60,60,67,0.3)]",
                      )}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Priority Liabilities Alert */}
          <AnimatePresence>
            {liabilities.some((l) => l.isPriority) &&
              selectedCategory !== "Savings" &&
              selectedCategory !== "Investments" &&
              !isSelecting && (
                <motion.section
                  key="priority-alert"
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-5 mt-6 overflow-hidden"
                >
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCategory("Liabilities")}
                    className="cursor-pointer bg-gradient-to-r from-[#FF3B30] to-[#FF6B6B] rounded-2xl p-4 shadow-lg shadow-[#FF3B30]/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                        ⚠️
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-white/80 uppercase tracking-wide">
                          Priority Payment
                        </p>
                        <p className="text-[20px] font-bold text-white">
                          Loan from Kuya
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[24px] font-bold text-white">
                          ₱
                          {(
                            liabilities.find((l) => l.isPriority)?.amount || 0
                          ).toLocaleString()}
                        </p>
                        <p className="text-[12px] text-white/70">Outstanding</p>
                      </div>
                    </div>
                  </motion.div>
                </motion.section>
              )}
          </AnimatePresence>

          {/* Liabilities List */}
          <AnimatePresence>
            {filteredLiabilities.length > 0 && !isSelecting && (
              <motion.section
                key="liabilities-list"
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mx-5 mt-6"
              >
                <h3 className="text-[13px] font-semibold text-[#FF3B30] uppercase tracking-wide mb-2 px-1">
                  🚨 Obligations
                </h3>
                <motion.div
                  layout
                  className="bg-white rounded-2xl overflow-hidden border border-[#FF3B30]/20 shadow-[0_2px_12px_rgba(255,59,48,0.1)]"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredLiabilities.map((liability, index) => (
                      <motion.div
                        key={liability.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                        transition={{ duration: 0.2 }}
                      >
                        <LiabilityRow
                          {...liability}
                          item={liability}
                          onDelete={handleDeleteLiability}
                          onClick={() => handleLiabilityClick(liability)}
                          isSelecting={isSelecting}
                          isSelected={false} // Todo: Implement selection for accounts if needed
                        />
                        {index < filteredLiabilities.length - 1 && (
                          <div className="h-px bg-[rgba(60,60,67,0.12)] ml-[68px]" />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Assets List */}
          <AnimatePresence>
            {filteredAssets.length > 0 && !isSelecting && (
              <motion.section
                key="assets-list"
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mx-5 mt-6"
              >
                <h3 className="text-[13px] font-semibold text-[#34C759] uppercase tracking-wide mb-2 px-1">
                  💰 Assets
                </h3>
                <motion.div
                  layout
                  className="bg-white rounded-2xl overflow-hidden border border-black/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredAssets.map((asset, index) => (
                      <motion.div
                        key={asset.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                        transition={{ duration: 0.2 }}
                      >
                        <AssetRow
                          {...asset}
                          item={asset}
                          onDelete={handleDeleteAsset}
                          onClick={() => handleAssetClick(asset)}
                          isSelecting={isSelecting}
                          isSelected={false}
                        />
                        {index < filteredAssets.length - 1 && (
                          <div className="h-px bg-[rgba(60,60,67,0.12)] ml-[68px]" />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Transactions Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mx-5 mt-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-bold text-black">Transactions</h3>
              <button
                onClick={() => {
                  setIsSelecting(!isSelecting);
                  setSelectedIds(new Set());
                }}
                className="text-[15px] font-medium text-[#007AFF]"
              >
                {isSelecting ? "Done" : "Edit"}
              </button>
            </div>

            {Object.entries(groupedTransactions).map(([dateLabel, items]) => (
              <div key={dateLabel} className="mb-6">
                <p className="text-[13px] font-semibold text-[rgba(60,60,67,0.6)] mb-2 uppercase tracking-wide">
                  {dateLabel}
                </p>
                <div className="space-y-2">
                  {items.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      item={transaction}
                      isSelecting={isSelecting}
                      isSelected={selectedIds.has(transaction.id)}
                      onSelect={handleSelect}
                      onDelete={handleDeleteSingle}
                      onLongPress={handleLongPress}
                      onClick={() => setViewTransaction(transaction)}
                      onAccountClick={handleTransactionAccountClick}
                    />
                  ))}
                </div>
              </div>
            ))}

            <motion.button
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 text-center text-[15px] font-semibold text-[rgba(60,60,67,0.6)]"
            >
              Manage accounts list
            </motion.button>
          </motion.section>
        </>
      ) : (
        /* Search Results View */
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          className="px-5 pt-4 pb-32"
        >
          {/* Recent Searches History */}
          {!searchQuery && searchHistory.length > 0 && (
            <div className="mb-6">
              <p className="text-[11px] font-bold text-[rgba(60,60,67,0.4)] uppercase tracking-wider mb-3 px-1">
                Recent Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((term, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSearchQuery(term)}
                    className="px-3 py-1.5 bg-white border border-black/[0.06] rounded-full text-[14px] text-black/80 font-medium shadow-sm"
                  >
                    {term}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[13px] font-semibold text-[rgba(60,60,67,0.6)] mb-4 uppercase tracking-wide">
            {searchResults.length > 0
              ? `${searchResults.length} Results`
              : searchQuery || activeFilter !== "All"
                ? "No Matches"
                : "Search Transactions"}
          </p>

          <motion.div layout className="space-y-2">
            <AnimatePresence mode="popLayout">
              {searchResults.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    delay: Math.min(index * 0.05, 0.3),
                  }}
                >
                  <TransactionRow
                    item={transaction}
                    isSelecting={false}
                    isSelected={false}
                    onSelect={() => {}}
                    onDelete={handleDeleteSingle}
                    onClick={() => setViewTransaction(transaction)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({ isOpen: false, type: null, itemId: null })
        }
        onConfirm={handleConfirmDelete}
        title={
          confirmDialog.type === "bulk"
            ? `Delete ${selectedIds.size} Transactions?`
            : "Delete Transaction?"
        }
        message="This action cannot be undone."
      />

      <TransactionDetailSheet
        visible={!!viewTransaction}
        onClose={() => setViewTransaction(null)}
        transaction={viewTransaction}
        onAccountClick={(t) => {
          setViewTransaction(null);
          handleTransactionAccountClick(t);
        }}
      />

      <AccountDetailSheet
        isOpen={!!viewingAccount}
        onClose={() => setViewingAccount(null)}
        account={viewingAccount}
        transactions={transactions}
        highlightTransactionId={highlightTransactionId}
        onUpdateBalance={(newBalance) =>
          handleUpdateBalance(viewingAccount, newBalance)
        }
        onAddTransaction={() => {
          setViewingAccount(null);
          if (viewingAccount?.category)
            setSelectedCategory(viewingAccount.category);
          setShowAddSheet(true);
        }}
      />

      <AddTransactionSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        currentCategory={selectedCategory}
        savingsAccounts={assets.filter((a) => a.category === "Savings")}
        investmentAccounts={assets.filter((a) => a.category === "Investments")}
        liabilities={liabilities}
        onAdd={(transaction) => {
          lastLocalInteraction.current = Date.now(); // Mark interaction time
          setTransactions((prev) => [transaction, ...prev]);

          // Update the account balance based on transaction type
          if (transaction.category === "Liabilities" && transaction.accountId) {
            // Liability payment: reduce the outstanding balance
            setLiabilities((prev) =>
              prev.map((l) =>
                l.id === transaction.accountId
                  ? { ...l, amount: Math.max(0, l.amount - transaction.amount) }
                  : l,
              ),
            );
          } else if (
            (transaction.category === "Savings" ||
              transaction.category === "Investments") &&
            transaction.accountId
          ) {
            // Asset deposit: increase the balance
            const delta =
              transaction.type === "deposit"
                ? transaction.amount
                : -transaction.amount;
            setAssets((prev) =>
              prev.map((a) =>
                a.id === transaction.accountId
                  ? { ...a, amount: Math.max(0, a.amount + delta) }
                  : a,
              ),
            );
          }
        }}
      />

      {/* Reminder Settings Sheet */}
      <ReminderSettingsSheet
        visible={showReminderSettings}
        onClose={() => setShowReminderSettings(false)}
      />
    </PageTransition>
  );
}
