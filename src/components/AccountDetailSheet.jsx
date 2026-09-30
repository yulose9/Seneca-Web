import clsx from "clsx";
import {
  animate,
  motion,
  useMotionValue,
} from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CreditCard,
  History,
  Landmark,
  MoreHorizontal,
  Pen,
  Share2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useWebHaptics } from "web-haptics/react";
import {
  EASE_OUT,
  TAP,
  TAP_TRANSITION,
} from "../constants/motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Sheet from "./Sheet";

// Mock data for charts
const generateChartData = (baseValue, type) => {
  const data = [];
  let currentValue = baseValue;
  for (let i = 0; i < 7; i++) {
    const change =
      type === "Liabilities"
        ? -Math.random() * 1000
        : (Math.random() - 0.4) * 2000;
    currentValue += change;
    data.push({ day: i, value: Math.abs(currentValue) });
  }
  return data.reverse();
};

const RollingNumber = ({ value, prefix = "" }) => {
  const ref = useRef(null);
  const motionValue = useMotionValue(0); // Start from 0 or current? Let's animate from 0 for "sheet open" effect

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.6,
      ease: EASE_OUT,
      onUpdate: (latest) => {
        if (ref.current) {
          ref.current.textContent = `${prefix}${latest.toLocaleString(
            undefined,
            { minimumFractionDigits: 2, maximumFractionDigits: 2 },
          )}`;
        }
      },
    });
    return () => controls.stop();
  }, [value, prefix, motionValue]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}0.00
    </span>
  );
};

// Stagger capped so long histories don't take seconds to appear
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: EASE_OUT,
      delay: 0.1 + Math.min(i, 8) * 0.04,
    },
  }),
};

export default function AccountDetailSheet({
  account: accountProp,
  isOpen,
  onClose,
  transactions = [],
  onAddTransaction,
  highlightTransactionId,
  onUpdateBalance,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const haptic = useWebHaptics();
  const chartGradientId = useId();

  // Keep the last account so the sheet can finish its exit after the parent clears it
  const [cachedAccount, setCachedAccount] = useState(accountProp);
  if (accountProp && accountProp !== cachedAccount) setCachedAccount(accountProp);
  const account = accountProp || cachedAccount;

  const handleStartEdit = () => {
    setEditValue(account.amount.toString());
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const newVal = parseFloat(editValue);
    if (account && !isNaN(newVal) && newVal !== account.amount) {
      onUpdateBalance?.(newVal);
      haptic.trigger("success");
    }
    setIsEditing(false);
  };

  // Safe accessors
  const isLiability = account?.category === "Liabilities";

  // Filter transactions for this account
  const accountTransactions = useMemo(() => {
    if (!account) return [];
    return transactions
      .filter((t) => t.bank === account.name || t.accountId === account.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, account]);

  // Auto-scroll to highlighted transaction
  useEffect(() => {
    if (isOpen && highlightTransactionId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`tx-${highlightTransactionId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 400); // Wait for sheet animation
      return () => clearTimeout(timer);
    }
  }, [isOpen, highlightTransactionId]);

  const chartData = useMemo(() => {
    if (!account) return [];
    return generateChartData(account.amount, account.category);
  }, [account]);

  // Derived from the chart so it doesn't re-roll on every render
  const monthChange = useMemo(() => {
    if (chartData.length < 2 || !chartData[0].value) return 0;
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    return Math.round(((last - first) / first) * 100);
  }, [chartData]);

  const totalIn = useMemo(() => {
    if (!account) return 0;
    return accountTransactions
      .filter(
        (t) =>
          t.type === "deposit" ||
          t.type === "payment" ||
          (isLiability && t.type === "withdrawal"),
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [accountTransactions, isLiability, account]);

  const totalOut = useMemo(() => {
    if (!account) return 0;
    return accountTransactions
      .filter((t) => t.type === "withdrawal" && !isLiability)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [accountTransactions, isLiability, account]);

  // Calculate progress for liabilities
  const originalLoanEstimate =
    isLiability && account ? account.amount + totalIn : 0;
  const liabilityProgress =
    isLiability && originalLoanEstimate > 0
      ? ((originalLoanEstimate - account.amount) / originalLoanEstimate) * 100
      : 0;

  if (!account) return null;

  return (
    <Sheet
      open={isOpen}
      onClose={() => { haptic.trigger("medium"); onClose(); }}
      zIndex={450}
      label={account.name}
      className="fixed inset-x-0 bottom-0 h-[92vh] bg-canvas rounded-t-sheet overflow-hidden flex flex-col"
    >
        {/* Header */}
        <div className="bg-surface px-6 pt-5 pb-4 border-b border-black/[0.04] flex items-center justify-between sticky top-0 z-10">
          <div
            className="w-12 h-1.5 rounded-full bg-black/20 absolute top-2 left-1/2 -translate-x-1/2 cursor-pointer"
            onClick={() => { haptic.trigger("medium"); onClose(); }}
          />

          <motion.button
            whileTap={TAP}
            transition={TAP_TRANSITION}
            onClick={() => { haptic.trigger("medium"); onClose(); }}
            className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center -ml-2"
          >
            <X size={18} className="text-ink-2" />
          </motion.button>

          <div className="text-center">
            <h3 className="text-subhead font-semibold text-ink-2">
              {account.category === "Liabilities" ? "Liability" : "Asset"}
            </h3>
          </div>

          <motion.button
            whileTap={TAP}
            transition={TAP_TRANSITION}
            className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center -mr-2"
          >
            <MoreHorizontal size={18} className="text-ink-2" />
          </motion.button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-20">
          {/* Hero Section */}
          <div className="bg-surface pb-6 pt-2 px-6 rounded-b-sheet shadow-card relative z-0">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className={clsx(
                  "w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-card",
                  isLiability
                    ? "bg-gradient-to-br from-negative to-caution text-white"
                    : "bg-gradient-to-br from-white to-canvas border border-white",
                )}
              >
                {account.icon}
              </motion.div>

              <h1 className="text-title-2 font-bold text-ink mb-1 text-center">
                {account.name}
              </h1>
              <p className="text-subhead text-ink-2 font-medium mb-6">
                {account.platform}
              </p>

              <div className="flex items-center justify-center mb-8 relative">
                {isEditing ? (
                  <div className="flex items-center justify-center">
                    <span
                      className={clsx(
                        "text-large-title font-bold mr-1",
                        isLiability ? "text-negative" : "text-ink",
                      )}
                    >
                      {isLiability ? "-" : ""}₱
                    </span>
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSaveEdit()
                      }
                      autoFocus
                      className={clsx(
                        "text-large-title font-bold bg-transparent text-left w-[180px] outline-none border-b-2 border-dashed border-black/20 focus:border-black/50 p-0 m-0",
                        isLiability ? "text-negative" : "text-ink",
                      )}
                    />
                  </div>
                ) : (
                  <motion.button
                    whileTap={TAP}
                    transition={TAP_TRANSITION}
                    onClick={handleStartEdit}
                    className={clsx(
                      "relative flex items-center justify-center px-3 py-1 rounded-xl hover:bg-fill transition-colors duration-150 group",
                      isLiability ? "text-negative" : "text-ink",
                    )}
                  >
                    <span className="text-large-title font-bold">
                      <RollingNumber
                        value={account.amount}
                        prefix={isLiability ? "-₱" : "₱"}
                      />
                    </span>
                    <div className="absolute -right-10 w-8 h-8 rounded-full bg-black/[0.06] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Pen size={14} className="text-ink-2" />
                    </div>
                  </motion.button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <motion.button
                  whileTap={TAP}
                  transition={TAP_TRANSITION}
                  onClick={() =>
                    onAddTransaction(isLiability ? "payment" : "deposit")
                  }
                  className={clsx(
                    "py-3.5 rounded-xl font-semibold text-subhead flex items-center justify-center gap-2 shadow-float",
                    isLiability
                      ? "bg-negative text-white"
                      : "bg-black text-white",
                  )}
                >
                  {isLiability ? (
                    <CreditCard size={18} />
                  ) : (
                    <ArrowDownLeft size={18} />
                  )}
                  {isLiability ? "Pay" : "Add Funds"}
                </motion.button>

                <motion.button
                  whileTap={TAP}
                  transition={TAP_TRANSITION}
                  className="bg-canvas text-ink py-3.5 rounded-xl font-semibold text-subhead flex items-center justify-center gap-2"
                >
                  {isLiability ? (
                    <History size={18} />
                  ) : (
                    <ArrowUpRight size={18} />
                  )}
                  {isLiability ? "Add Loan" : "Withdraw"}
                </motion.button>
              </div>
            </div>
          </div>

          {/* Wealth/Debt Visualizer */}
          <div className="mx-5 mt-6 mb-2">
            <h3 className="text-footnote font-semibold text-ink-2 mb-3 ml-1">
              {isLiability ? "Road to freedom" : "Performance"}
            </h3>

            {isLiability ? (
              <div className="bg-surface p-5 rounded-2xl shadow-card">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-footnote text-ink-2 mb-1">
                      Paid Off
                    </p>
                    <p className="text-title-3 font-bold text-positive tabular-nums">
                      {liabilityProgress.toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-footnote text-ink-2 mb-1">
                      Remaining
                    </p>
                    <p className="text-title-3 font-bold text-negative tabular-nums">
                      ₱{account.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="h-3 bg-canvas rounded-full overflow-hidden">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: Math.min(liabilityProgress, 100) / 100 }}
                    transition={{ duration: 0.6, ease: EASE_OUT }}
                    style={{ originX: 0 }}
                    className="h-full w-full rounded-full bg-positive"
                  />
                </div>
                <p className="text-center text-caption text-ink-2 mt-3 font-medium">
                  {originalLoanEstimate > 0
                    ? `You've paid ₱${(
                        originalLoanEstimate - account.amount
                      ).toLocaleString()} so far!`
                    : "Make your first payment to start tracking progress."}
                </p>
              </div>
            ) : (
              <div className="bg-surface p-4 rounded-2xl shadow-card h-[180px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-positive/10 flex items-center justify-center">
                      <TrendingUp size={16} className="text-positive" />
                    </div>
                    <div>
                      <p className="text-footnote text-ink-2">
                        This Month
                      </p>
                      <p className="text-subhead font-bold text-positive">
                        {monthChange >= 0 ? "+" : ""}{monthChange}%
                      </p>
                    </div>
                  </div>
                  <div className="bg-canvas px-3 py-1 rounded-full text-caption font-medium text-ink-2">
                    7 Days
                  </div>
                </div>

                <div className="flex-1 w-full -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient
                          id={chartGradientId}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={isLiability ? "var(--color-negative)" : "var(--color-positive)"}
                            stopOpacity={0.1}
                          />
                          <stop
                            offset="95%"
                            stopColor={isLiability ? "var(--color-negative)" : "var(--color-positive)"}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <Tooltip cursor={false} content={<></>} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={isLiability ? "var(--color-negative)" : "var(--color-positive)"}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill={`url(#${chartGradientId})`}
                        animationDuration={600}
                        animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 mx-5 mb-6">
            <div className="bg-surface p-4 rounded-2xl shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={16} className="text-accent" />
                <p className="text-caption font-semibold text-ink-2">
                  Total in
                </p>
              </div>
              <p className="text-body font-bold text-ink tabular-nums">
                ₱{totalIn.toLocaleString()}
              </p>
            </div>
            <div className="bg-surface p-4 rounded-2xl shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <Share2 size={16} className="text-caution" />
                <p className="text-caption font-semibold text-ink-2">
                  Total out
                </p>
              </div>
              <p className="text-body font-bold text-ink tabular-nums">
                ₱{totalOut.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mx-5">
          <h3 className="text-footnote font-semibold text-ink-2 mb-3 ml-1">
            Latest activity
          </h3>
          <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
            {accountTransactions.length > 0 ? (
              accountTransactions.map((t, i) => (
                <motion.div
                  key={t.id}
                  id={`tx-${t.id}`}
                  variants={itemVariants}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  className={clsx(
                    "flex items-center p-4 border-b border-black/[0.04] last:border-0 cursor-pointer transition-colors duration-150 active:bg-black/[0.02]",
                    t.id === highlightTransactionId
                      ? "bg-yellow/15"
                      : "",
                  )}
                >
                  <div
                    className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center text-body mr-3 shrink-0",
                      t.type === "deposit"
                        ? "bg-positive/10"
                        : "bg-fill",
                    )}
                  >
                    {t.type === "deposit" ? "💰" : "💸"}
                  </div>
                  <div className="flex-1">
                    <p className="text-subhead font-semibold text-ink">
                      {t.note || t.location || "Transaction"}
                    </p>
                    <p className="text-footnote text-ink-2">
                      {new Date(t.date).toLocaleDateString()}
                    </p>
                  </div>
                  <p
                    className={clsx(
                      "text-subhead font-bold tabular-nums",
                      t.type === "deposit"
                        ? "text-positive"
                        : "text-ink",
                    )}
                  >
                    {t.type === "deposit" ? "+" : "-"}₱
                    {t.amount.toLocaleString()}
                  </p>
                </motion.div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-ink-3 font-medium">
                  No transactions yet
                </p>
              </div>
            )}
          </div>
          </div>
        </div>
    </Sheet>
  );
}
