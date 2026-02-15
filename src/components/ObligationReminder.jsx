import { AnimatePresence, motion } from "framer-motion";
import { Bell, Clock, X } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { getGlobalData, subscribeToGlobalData } from "../services/dataLogger";

// LocalStorage key for snooze
const SNOOZE_KEY = "obligation_reminder_snooze";

// Snooze options
const SNOOZE_OPTIONS = [
  { label: "3 Hours", ms: 3 * 60 * 60 * 1000 },
  { label: "1 Day", ms: 24 * 60 * 60 * 1000 },
  { label: "3 Days", ms: 3 * 24 * 60 * 60 * 1000 },
];

// Check if the reminder is currently snoozed
const isSnoozed = () => {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const snoozeUntil = JSON.parse(raw);
    if (Date.now() < snoozeUntil) return true;
    // Expired — clear it
    localStorage.removeItem(SNOOZE_KEY);
    return false;
  } catch {
    return false;
  }
};

// Set a snooze
const setSnooze = (durationMs) => {
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(Date.now() + durationMs));
};

export default function ObligationReminder({ isOpen, onClose, forceOpen = false }) {
  const [liabilities, setLiabilities] = useState([]);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Load liabilities from global wealth data
  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getGlobalData("wealth");
        if (data?.liabilities) {
          setLiabilities(data.liabilities);
        }
      } catch {
        // Try localStorage fallback
        try {
          const raw = localStorage.getItem("seneca_global_data");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.wealth?.liabilities) {
              setLiabilities(parsed.wealth.liabilities);
            }
          }
        } catch { /* ignore */ }
      }
    };
    fetch();

    // Subscribe to real-time updates
    const unsub = subscribeToGlobalData("wealth", (data) => {
      if (data?.liabilities) {
        setLiabilities(data.liabilities);
      }
    });
    return () => unsub();
  }, []);

  const totalObligations = liabilities.reduce((sum, l) => sum + (l.amount || 0), 0);
  const kuyaLoan = liabilities.find((l) => l.id === "kuya" || l.isPriority);
  const otherLoans = liabilities.filter((l) => l.id !== "kuya" && !l.isPriority);
  const otherTotal = otherLoans.reduce((sum, l) => sum + (l.amount || 0), 0);

  const handleSnooze = (durationMs) => {
    setSnooze(durationMs);
    setShowSnoozeOptions(false);
    setDismissed(true);
    onClose?.();
  };

  const visible = isOpen && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999]"
            onClick={() => setShowSnoozeOptions(true)}
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
              <div className="bg-gradient-to-r from-[#FF3B30] to-[#FF6B5E] px-6 pt-6 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Bell size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-[17px] font-bold text-white">Obligation Reminder</h3>
                      <p className="text-[12px] text-white/70 font-medium">Total Outstanding</p>
                    </div>
                  </div>
                </div>
                <p className="text-[32px] font-bold text-white tracking-tight">
                  ₱{totalObligations.toLocaleString()}
                </p>
              </div>

              {/* Liabilities */}
              <div className="px-6 py-4 space-y-3">
                {/* Kuya loan */}
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

                {/* Other loans */}
                {otherLoans.length > 0 && (
                  <div className="flex items-center justify-between py-3 px-4 rounded-2xl bg-[rgba(120,120,128,0.04)] border border-[rgba(120,120,128,0.08)]">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏦</span>
                      <div>
                        <p className="text-[15px] font-semibold text-black">
                          {otherLoans.length === 1 ? otherLoans[0].name : "Other Loans"}
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

              {/* Actions */}
              <div className="px-6 pb-6">
                <AnimatePresence mode="wait">
                  {!showSnoozeOptions ? (
                    <motion.div
                      key="main-actions"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2"
                    >
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowSnoozeOptions(true)}
                        className="w-full py-3.5 rounded-xl bg-[rgba(120,120,128,0.08)] text-[15px] font-semibold text-[rgba(60,60,67,0.8)] flex items-center justify-center gap-2"
                      >
                        <Clock size={16} />
                        Remind Me Later
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="snooze-options"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2"
                    >
                      <p className="text-[13px] font-semibold text-center text-[rgba(60,60,67,0.5)] uppercase tracking-wide mb-3">
                        Snooze for...
                      </p>
                      {SNOOZE_OPTIONS.map((opt) => (
                        <motion.button
                          key={opt.label}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleSnooze(opt.ms)}
                          className="w-full py-3 rounded-xl bg-[rgba(120,120,128,0.06)] text-[15px] font-medium text-black flex items-center justify-center gap-2 active:bg-[rgba(120,120,128,0.12)] transition-colors"
                        >
                          <Clock size={15} className="text-[rgba(60,60,67,0.4)]" />
                          {opt.label}
                        </motion.button>
                      ))}
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowSnoozeOptions(false)}
                        className="w-full py-3 rounded-xl text-[15px] font-medium text-[#007AFF] mt-1"
                      >
                        Cancel
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to auto-show the reminder on app open (unless snoozed)
export function useObligationReminder() {
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    // Check on mount — show if not snoozed
    if (!isSnoozed()) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setShowReminder(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const openReminder = useCallback(() => {
    setShowReminder(true);
  }, []);

  const closeReminder = useCallback(() => {
    setShowReminder(false);
  }, []);

  return { showReminder, openReminder, closeReminder };
}
