import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Clock, X } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { subscribeToGlobalData } from "../services/dataLogger";

// LocalStorage keys for snooze
const SNOOZE_KEY = "obligation_reminder_snooze";
const TASKS_SNOOZE_KEY = "tasks_reminder_snooze";

// Snooze options (shared by both settings sheets)
const SNOOZE_OPTIONS = [
  { label: "Every app open", description: "Always remind me", ms: 0 },
  {
    label: "3 Hours",
    description: "Snooze for 3 hours",
    ms: 3 * 60 * 60 * 1000,
  },
  { label: "1 Day", description: "Snooze for 1 day", ms: 24 * 60 * 60 * 1000 },
  {
    label: "3 Days",
    description: "Snooze for 3 days",
    ms: 3 * 24 * 60 * 60 * 1000,
  },
];

// Generic snooze helpers that work with any key
const isSnoozedKey = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const snoozeUntil = JSON.parse(raw);
    if (Date.now() < snoozeUntil) return true;
    localStorage.removeItem(key);
    return false;
  } catch {
    return false;
  }
};

const setSnoozeKey = (key, durationMs) => {
  if (durationMs <= 0) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(Date.now() + durationMs));
  }
};

const getSnoozeInfoKey = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { snoozed: false, label: "Every app open" };
    const snoozeUntil = JSON.parse(raw);
    if (Date.now() >= snoozeUntil) {
      localStorage.removeItem(key);
      return { snoozed: false, label: "Every app open" };
    }
    const remaining = snoozeUntil - Date.now();
    const hours = Math.ceil(remaining / (60 * 60 * 1000));
    if (hours < 24) return { snoozed: true, label: `Snoozed (${hours}h left)` };
    const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
    return { snoozed: true, label: `Snoozed (${days}d left)` };
  } catch {
    return { snoozed: false, label: "Every app open" };
  }
};

// Convenience wrappers for obligation
const isObligationSnoozed = () => isSnoozedKey(SNOOZE_KEY);
const setObligationSnooze = (ms) => setSnoozeKey(SNOOZE_KEY, ms);
const getObligationSnoozeInfo = () => getSnoozeInfoKey(SNOOZE_KEY);

// Convenience wrappers for tasks
const isTasksSnoozed = () => isSnoozedKey(TASKS_SNOOZE_KEY);
const setTasksSnooze = (ms) => setSnoozeKey(TASKS_SNOOZE_KEY, ms);
const getTasksSnoozeInfo = () => getSnoozeInfoKey(TASKS_SNOOZE_KEY);

// ─── Notification Popup (shows on app open) ─────────────────────────
// Load liabilities instantly from localStorage, preferring Firestore cache
const loadLiabilitiesLocal = () => {
  try {
    const raw = localStorage.getItem("seneca_global_data");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.wealth?.liabilities?.length) return parsed.wealth.liabilities;
    }
    const saved = localStorage.getItem("wealth_liabilities");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
};

// Load transactions from localStorage
const loadTransactionsLocal = () => {
  try {
    const raw = localStorage.getItem("seneca_global_data");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.wealth?.transactions?.length) return parsed.wealth.transactions;
    }
    const saved = localStorage.getItem("wealth_transactions");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
};

// Format a date into a human-readable relative time
const formatRelativeTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays <= 6) {
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    return `last ${dayName}`;
  }
  if (diffDays <= 13) return "a week ago";
  if (diffDays <= 29) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays <= 59) return "a month ago";
  if (diffDays <= 364) return `${Math.floor(diffDays / 30)} months ago`;
  return "over a year ago";
};

// Find the last payment transaction for a specific liability
const findLastPayment = (transactions, liability) => {
  // Match by accountId or bank name, only "payment" or "deposit" on Liabilities category
  const payments = transactions.filter(
    (t) =>
      t.category === "Liabilities" &&
      (t.type === "payment" || t.type === "deposit") &&
      (t.accountId === liability.id || t.bank === liability.name),
  );
  if (payments.length === 0) return null;
  // Sort by date descending, return most recent
  payments.sort((a, b) => new Date(b.date) - new Date(a.date));
  return payments[0];
};

export default function ObligationReminder({ isOpen, onClose }) {
  // Load instantly from localStorage — no waiting for Firestore
  const [liabilities, setLiabilities] = useState(loadLiabilitiesLocal);
  const [transactions, setTransactions] = useState(loadTransactionsLocal);

  useEffect(() => {
    // Also subscribe to Firestore for live updates
    const unsub = subscribeToGlobalData("wealth", (data) => {
      if (data?.liabilities) setLiabilities(data.liabilities);
      if (data?.transactions) setTransactions(data.transactions);
    });
    return () => unsub();
  }, []);

  const totalObligations = liabilities.reduce(
    (sum, l) => sum + (l.amount || 0),
    0,
  );
  const kuyaLoan = liabilities.find((l) => l.id === "kuya" || l.isPriority);
  const otherLoans = liabilities.filter(
    (l) => l.id !== "kuya" && !l.isPriority,
  );

  const handleDismiss = () => {
    onClose?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999]"
            onClick={handleDismiss}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed inset-x-5 top-1/2 -translate-y-1/2 z-[10000] max-w-md mx-auto"
          >
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl select-none">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#FF3B30] to-[#FF6B5E] px-6 pt-6 pb-5 relative">
                {/* Close button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDismiss}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                >
                  <X size={16} className="text-white" />
                </motion.button>

                <div className="flex items-center gap-2.5 mb-3 pr-10">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Bell size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-white">
                      Obligation Reminder
                    </h3>
                    <p className="text-[12px] text-white/70 font-medium">
                      Total Outstanding
                    </p>
                  </div>
                </div>
                <p className="text-[32px] font-bold text-white tracking-tight">
                  ₱{totalObligations.toLocaleString()}
                </p>
              </div>

              {/* Liabilities */}
              <div className="px-6 py-4 space-y-3">
                {kuyaLoan && (() => {
                  const lastPay = findLastPayment(transactions, kuyaLoan);
                  return (
                    <div className="rounded-2xl bg-[#FF3B30]/5 border border-[#FF3B30]/10 overflow-hidden">
                      <div className="flex items-center justify-between py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{kuyaLoan.icon || "🧑"}</span>
                          <div>
                            <p className="text-[15px] font-semibold text-black">
                              {kuyaLoan.name || "Loan from Kuya"}
                            </p>
                            <p className="text-[12px] text-[rgba(60,60,67,0.5)] font-medium">
                              {kuyaLoan.platform || "Personal"} • Priority
                            </p>
                          </div>
                        </div>
                        <p className="text-[17px] font-bold text-[#FF3B30]">
                          ₱{(kuyaLoan.amount || 0).toLocaleString()}
                        </p>
                      </div>
                      {/* Last payment info */}
                      <div className="px-4 pb-3 pt-0">
                        <div className="bg-white/70 rounded-xl px-3 py-2">
                          {lastPay ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full bg-[#34C759]/15 flex items-center justify-center">
                                  <Check size={10} className="text-[#34C759]" />
                                </div>
                                <p className="text-[11px] text-[rgba(60,60,67,0.6)] font-medium">
                                  Paid <span className="font-semibold text-[#34C759]">₱{lastPay.amount.toLocaleString()}</span> · {formatRelativeTime(lastPay.date)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-[rgba(60,60,67,0.4)] font-medium italic">
                              No payments recorded yet
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {otherLoans.length > 0 && otherLoans.map((loan) => {
                  const lastPay = findLastPayment(transactions, loan);
                  return (
                    <div key={loan.id} className="rounded-2xl bg-[rgba(120,120,128,0.04)] border border-[rgba(120,120,128,0.08)] overflow-hidden">
                      <div className="flex items-center justify-between py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{loan.icon || "🍀"}</span>
                          <div>
                            <p className="text-[15px] font-semibold text-black">
                              {loan.name}
                            </p>
                            <p className="text-[12px] text-[rgba(60,60,67,0.5)] font-medium">
                              {loan.platform || "Bank / Other"}
                            </p>
                          </div>
                        </div>
                        <p className="text-[17px] font-bold text-[rgba(60,60,67,0.8)]">
                          ₱{(loan.amount || 0).toLocaleString()}
                        </p>
                      </div>
                      {/* Last payment info */}
                      <div className="px-4 pb-3 pt-0">
                        <div className="bg-white/70 rounded-xl px-3 py-2">
                          {lastPay ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full bg-[#34C759]/15 flex items-center justify-center">
                                  <Check size={10} className="text-[#34C759]" />
                                </div>
                                <p className="text-[11px] text-[rgba(60,60,67,0.6)] font-medium">
                                  Paid <span className="font-semibold text-[#34C759]">₱{lastPay.amount.toLocaleString()}</span> · {formatRelativeTime(lastPay.date)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-[rgba(60,60,67,0.4)] font-medium italic">
                              No payments recorded yet
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Motivational message */}
                <div className="pt-2 pb-1">
                  <p className="text-center text-[15px] text-[rgba(60,60,67,0.6)] leading-relaxed italic">
                    "Have you paid or lessened this? Every peso counts."
                  </p>
                </div>
              </div>

              {/* Dismiss action */}
              <div className="px-6 pb-6">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDismiss}
                  className="w-full py-3.5 rounded-xl bg-[rgba(120,120,128,0.08)] text-[15px] font-semibold text-[rgba(60,60,67,0.8)] flex items-center justify-center gap-2"
                >
                  <Clock size={16} />
                  Remind Me Later
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Obligation Reminder Settings Sheet (for Wealth bell icon) ──────
export function ReminderSettingsSheet({ visible, onClose }) {
  const [snoozeInfo, setSnoozeInfo] = useState(getObligationSnoozeInfo);

  const handleSetSnooze = (ms) => {
    setObligationSnooze(ms);
    setSnoozeInfo(getObligationSnoozeInfo());
  };

  // Refresh snooze info when opened
  useEffect(() => {
    if (visible) setSnoozeInfo(getObligationSnoozeInfo());
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fixed inset-x-0 bottom-0 z-[9999] max-w-md mx-auto"
          >
            <div className="bg-white rounded-t-3xl shadow-2xl pb-10">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-[rgba(60,60,67,0.15)]" />
              </div>

              {/* Header */}
              <div className="px-6 pt-3 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-[19px] font-bold text-black">
                    Reminder Settings
                  </h3>
                  <p className="text-[13px] text-[rgba(60,60,67,0.5)] mt-0.5">
                    {snoozeInfo.label}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[rgba(120,120,128,0.12)] flex items-center justify-center"
                >
                  <X size={16} className="text-[rgba(60,60,67,0.6)]" />
                </motion.button>
              </div>

              {/* Frequency label */}
              <div className="px-6 pb-2">
                <p className="text-[13px] font-semibold text-[rgba(60,60,67,0.4)] uppercase tracking-wide">
                  Reminder Frequency
                </p>
              </div>

              {/* Options */}
              <div className="px-6 space-y-1">
                {SNOOZE_OPTIONS.map((opt) => {
                  const isActive = opt.ms === 0 ? !snoozeInfo.snoozed : false; // Current selection indicator

                  return (
                    <motion.button
                      key={opt.label}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSetSnooze(opt.ms)}
                      className={`w-full py-3.5 px-4 rounded-xl flex items-center justify-between transition-colors ${
                        isActive
                          ? "bg-[#007AFF]/8 border border-[#007AFF]/15"
                          : "bg-[rgba(120,120,128,0.04)] border border-transparent active:bg-[rgba(120,120,128,0.08)]"
                      }`}
                      style={
                        isActive
                          ? {
                              backgroundColor: "rgba(0,122,255,0.08)",
                              borderColor: "rgba(0,122,255,0.15)",
                            }
                          : {}
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Clock
                          size={18}
                          className={
                            isActive
                              ? "text-[#007AFF]"
                              : "text-[rgba(60,60,67,0.4)]"
                          }
                        />
                        <div className="text-left">
                          <p
                            className={`text-[15px] font-semibold ${isActive ? "text-[#007AFF]" : "text-black"}`}
                          >
                            {opt.label}
                          </p>
                          <p className="text-[12px] text-[rgba(60,60,67,0.5)]">
                            {opt.description}
                          </p>
                        </div>
                      </div>
                      {isActive && (
                        <Check size={18} className="text-[#007AFF]" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Info note */}
              <div className="px-6 pt-4">
                <p className="text-[12px] text-[rgba(60,60,67,0.4)] text-center leading-relaxed">
                  You can't turn off reminders completely. This ensures you stay
                  on top of your obligations.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Hook: auto-show on every app open (page load) ─────────────────
// Each notification has its own independent snooze.
// Chains: obligation popup → (dismiss) → daily tasks popup (if not snoozed).
export function useObligationReminder() {
  const [showReminder, setShowReminder] = useState(false);
  const [showTasksReminder, setShowTasksReminder] = useState(false);

  useEffect(() => {
    const obligationSnoozed = isObligationSnoozed();
    const tasksSnoozed = isTasksSnoozed();

    if (!obligationSnoozed) {
      // Show obligation first, tasks will chain after dismiss
      const timer = setTimeout(() => setShowReminder(true), 800);
      return () => clearTimeout(timer);
    } else if (!tasksSnoozed) {
      // Obligation snoozed, go straight to tasks
      const timer = setTimeout(() => setShowTasksReminder(true), 800);
      return () => clearTimeout(timer);
    }
    // Both snoozed → show nothing
  }, []);

  const openReminder = useCallback(() => setShowReminder(true), []);

  const closeReminder = useCallback(() => {
    setShowReminder(false);
    // After dismissing obligation, show tasks if not snoozed
    if (!isTasksSnoozed()) {
      setTimeout(() => setShowTasksReminder(true), 400);
    }
  }, []);

  const closeTasksReminder = useCallback(() => {
    setShowTasksReminder(false);
  }, []);

  return {
    showReminder,
    openReminder,
    closeReminder,
    showTasksReminder,
    closeTasksReminder,
  };
}

// ─── Tasks Reminder Settings Sheet (for Protocol bell icon) ─────────
export function TasksReminderSettingsSheet({ visible, onClose }) {
  const [snoozeInfo, setSnoozeInfo] = useState(getTasksSnoozeInfo);

  const handleSetSnooze = (ms) => {
    setTasksSnooze(ms);
    setSnoozeInfo(getTasksSnoozeInfo());
  };

  useEffect(() => {
    if (visible) setSnoozeInfo(getTasksSnoozeInfo());
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fixed inset-x-0 bottom-0 z-[9999] max-w-md mx-auto"
          >
            <div className="bg-white rounded-t-3xl shadow-2xl pb-10">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-[rgba(60,60,67,0.15)]" />
              </div>

              <div className="px-6 pt-3 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-[19px] font-bold text-black">
                    Tasks Reminder
                  </h3>
                  <p className="text-[13px] text-[rgba(60,60,67,0.5)] mt-0.5">
                    {snoozeInfo.label}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[rgba(120,120,128,0.12)] flex items-center justify-center"
                >
                  <X size={16} className="text-[rgba(60,60,67,0.6)]" />
                </motion.button>
              </div>

              <div className="px-6 pb-2">
                <p className="text-[13px] font-semibold text-[rgba(60,60,67,0.4)] uppercase tracking-wide">
                  Reminder Frequency
                </p>
              </div>

              <div className="px-6 space-y-1">
                {SNOOZE_OPTIONS.map((opt) => {
                  const isActive = opt.ms === 0 ? !snoozeInfo.snoozed : false;

                  return (
                    <motion.button
                      key={opt.label}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSetSnooze(opt.ms)}
                      className={`w-full py-3.5 px-4 rounded-xl flex items-center justify-between transition-colors ${
                        isActive
                          ? "bg-[#FF9500]/8 border border-[#FF9500]/15"
                          : "bg-[rgba(120,120,128,0.04)] border border-transparent active:bg-[rgba(120,120,128,0.08)]"
                      }`}
                      style={
                        isActive
                          ? {
                              backgroundColor: "rgba(255,149,0,0.08)",
                              borderColor: "rgba(255,149,0,0.15)",
                            }
                          : {}
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Clock
                          size={18}
                          className={
                            isActive
                              ? "text-[#FF9500]"
                              : "text-[rgba(60,60,67,0.4)]"
                          }
                        />
                        <div className="text-left">
                          <p
                            className={`text-[15px] font-semibold ${isActive ? "text-[#FF9500]" : "text-black"}`}
                          >
                            {opt.label}
                          </p>
                          <p className="text-[12px] text-[rgba(60,60,67,0.5)]">
                            {opt.description}
                          </p>
                        </div>
                      </div>
                      {isActive && (
                        <Check size={18} className="text-[#FF9500]" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="px-6 pt-4">
                <p className="text-[12px] text-[rgba(60,60,67,0.4)] text-center leading-relaxed">
                  Controls when the daily tasks reminder appears on app open.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
