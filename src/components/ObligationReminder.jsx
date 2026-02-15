import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Clock, X } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { subscribeToGlobalData } from "../services/dataLogger";

// LocalStorage key for snooze
const SNOOZE_KEY = "obligation_reminder_snooze";

// Snooze options (used by settings sheet in Wealth)
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

// Check if the reminder is currently snoozed
const isSnoozed = () => {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const snoozeUntil = JSON.parse(raw);
    if (Date.now() < snoozeUntil) return true;
    localStorage.removeItem(SNOOZE_KEY);
    return false;
  } catch {
    return false;
  }
};

// Set a snooze (0 = clear / every app open)
const setSnooze = (durationMs) => {
  if (durationMs <= 0) {
    localStorage.removeItem(SNOOZE_KEY);
  } else {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(Date.now() + durationMs));
  }
};

// Get current snooze info for display
const getSnoozeInfo = () => {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return { snoozed: false, label: "Every app open" };
    const snoozeUntil = JSON.parse(raw);
    if (Date.now() >= snoozeUntil) {
      localStorage.removeItem(SNOOZE_KEY);
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

// ─── Notification Popup (shows on app open) ─────────────────────────
// Load liabilities instantly from localStorage (same key Wealth.jsx uses)
const loadLiabilitiesLocal = () => {
  try {
    // Primary: Wealth page stores here
    const saved = localStorage.getItem("wealth_liabilities");
    if (saved) return JSON.parse(saved);
    // Fallback: Firestore cache
    const raw = localStorage.getItem("seneca_global_data");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.wealth?.liabilities) return parsed.wealth.liabilities;
    }
  } catch { /* ignore */ }
  return [];
};

export default function ObligationReminder({ isOpen, onClose }) {
  // Load instantly from localStorage — no waiting for Firestore
  const [liabilities, setLiabilities] = useState(loadLiabilitiesLocal);

  useEffect(() => {
    // Also subscribe to Firestore for live updates
    const unsub = subscribeToGlobalData("wealth", (data) => {
      if (data?.liabilities) setLiabilities(data.liabilities);
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
  const otherTotal = otherLoans.reduce((sum, l) => sum + (l.amount || 0), 0);

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
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
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
                {kuyaLoan && (
                  <div className="flex items-center justify-between py-3 px-4 rounded-2xl bg-[#FF3B30]/5 border border-[#FF3B30]/10">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🤝</span>
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
                )}

                {otherLoans.length > 0 && (
                  <div className="flex items-center justify-between py-3 px-4 rounded-2xl bg-[rgba(120,120,128,0.04)] border border-[rgba(120,120,128,0.08)]">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏦</span>
                      <div>
                        <p className="text-[15px] font-semibold text-black">
                          {otherLoans.length === 1
                            ? otherLoans[0].name
                            : "Other Loans"}
                        </p>
                        <p className="text-[12px] text-[rgba(60,60,67,0.5)] font-medium">
                          {otherLoans.length === 1
                            ? otherLoans[0].platform || "Bank / Other"
                            : `${otherLoans.length} outstanding obligations`}
                        </p>
                      </div>
                    </div>
                    <p className="text-[17px] font-bold text-[rgba(60,60,67,0.8)]">
                      ₱{otherTotal.toLocaleString()}
                    </p>
                  </div>
                )}

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

// ─── Reminder Settings Sheet (for Wealth bell icon) ─────────────────
export function ReminderSettingsSheet({ visible, onClose }) {
  const [snoozeInfo, setSnoozeInfo] = useState(getSnoozeInfo);

  const handleSetSnooze = (ms) => {
    setSnooze(ms);
    setSnoozeInfo(getSnoozeInfo());
  };

  // Refresh snooze info when opened
  useEffect(() => {
    if (visible) setSnoozeInfo(getSnoozeInfo());
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

// ─── Hook: auto-show ONCE per app session ───────────────────────────
// Chains: obligation popup → (dismiss) → daily tasks popup
// Uses sessionStorage so popups only fire once per browser session (tab open).
const SESSION_KEY = "obligation_shown_session";

export function useObligationReminder() {
  const [showReminder, setShowReminder] = useState(false);
  const [showTasksReminder, setShowTasksReminder] = useState(false);

  useEffect(() => {
    // Already shown this session? Skip.
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    if (!isSnoozed()) {
      const timer = setTimeout(() => setShowReminder(true), 800);
      return () => clearTimeout(timer);
    } else {
      // If obligation is snoozed, go straight to tasks reminder
      const timer = setTimeout(() => setShowTasksReminder(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const openReminder = useCallback(() => setShowReminder(true), []);

  const closeReminder = useCallback(() => {
    setShowReminder(false);
    // After dismissing obligation, show tasks reminder
    setTimeout(() => setShowTasksReminder(true), 400);
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
