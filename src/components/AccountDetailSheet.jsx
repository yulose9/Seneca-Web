import clsx from "clsx";
import {
  animate,
  AnimatePresence,
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
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1], // Apple-style spring-ish ease
      onUpdate: (latest) => {
        if (ref.current) {
          ref.current.textContent = `${prefix}${latest.toLocaleString(
            undefined,
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          )}`;
        }
      },
    });
    return () => controls.stop();
  }, [value, prefix]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}0.00
    </span>
  );
};

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function AccountDetailSheet({
  account,
  isOpen,
  onClose,
  transactions = [],
  onAddTransaction,
  highlightTransactionId,
  onUpdateBalance,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const handleStartEdit = () => {
    setEditValue(account.amount.toString());
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const newVal = parseFloat(editValue);
    if (account && !isNaN(newVal) && newVal !== account.amount) {
      onUpdateBalance?.(newVal);
    }
    setIsEditing(false);
  };

  // Safe accessors
  const isLiability = account?.category === "Liabilities";
  const isInvestment = account?.category === "Investments";

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
      setTimeout(() => {
        const el = document.getElementById(`tx-${highlightTransactionId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 400); // Wait for sheet animation
    }
  }, [isOpen, highlightTransactionId]);

  const chartData = useMemo(() => {
    if (!account) return [];
    return generateChartData(account.amount, account.category);
  }, [account]);

  const totalIn = useMemo(() => {
    if (!account) return 0;
    return accountTransactions
      .filter(
        (t) => t.type === "deposit" || (isLiability && t.type === "withdrawal")
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

  if (!account && !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[450]"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 h-[92vh] bg-[#F2F2F7] rounded-t-[32px] z-[451] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-white px-6 pt-5 pb-4 border-b border-black/[0.04] flex items-center justify-between sticky top-0 z-10">
              <div
                className="w-12 h-1.5 rounded-full bg-black/20 absolute top-2 left-1/2 -translate-x-1/2 cursor-pointer"
                onClick={onClose}
              />

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center -ml-2"
              >
                <X size={18} className="text-black/60" />
              </motion.button>

              <div className="text-center">
                <h3 className="text-[15px] font-semibold text-black/40 uppercase tracking-widest">
                  {account.category === "Liabilities" ? "Liability" : "Asset"}
                </h3>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center -mr-2"
              >
                <MoreHorizontal size={18} className="text-black/60" />
              </motion.button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-20">
              {/* Hero Section */}
              <div className="bg-white pb-6 pt-2 px-6 rounded-b-[32px] shadow-sm relative z-0">
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={clsx(
                      "w-20 h-20 rounded-[28px] flex items-center justify-center text-4xl mb-4 shadow-xl",
                      isLiability
                        ? "bg-gradient-to-br from-[#FF3B30] to-[#FF9500] text-white"
                        : "bg-gradient-to-br from-white to-[#F2F2F7] border border-white shadow-black/5"
                    )}
                  >
                    {account.icon}
                  </motion.div>

                  <h1 className="text-2xl font-bold text-black mb-1 text-center">
                    {account.name}
                  </h1>
                  <p className="text-[15px] text-black/50 font-medium mb-6">
                    {account.platform}
                  </p>

                  <div className="flex items-center justify-center mb-8 relative">
                    {isEditing ? (
                      <div className="flex items-center justify-center">
                        <span
                          className={clsx(
                            "text-4xl font-bold tracking-tight mr-1",
                            isLiability ? "text-[#FF3B30]" : "text-black"
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
                            "text-4xl font-bold tracking-tight bg-transparent text-left w-[180px] outline-none border-b-2 border-dashed border-black/20 focus:border-black/50 p-0 m-0",
                            isLiability ? "text-[#FF3B30]" : "text-black"
                          )}
                        />
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStartEdit}
                        className={clsx(
                          "relative flex items-center justify-center px-3 py-1 rounded-xl hover:bg-black/5 transition-colors group",
                          isLiability ? "text-[#FF3B30]" : "text-black"
                        )}
                      >
                        <span className="text-4xl font-bold tracking-tight">
                          <RollingNumber
                            value={account.amount}
                            prefix={isLiability ? "-₱" : "₱"}
                          />
                        </span>
                        <div className="absolute -right-10 w-8 h-8 rounded-full bg-black/[0.06] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Pen size={14} className="text-black/50" />
                        </div>
                      </motion.button>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() =>
                        onAddTransaction(isLiability ? "payment" : "deposit")
                      }
                      className={clsx(
                        "py-3.5 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 shadow-lg",
                        isLiability
                          ? "bg-[#FF3B30] text-white shadow-[#FF3B30]/20"
                          : "bg-black text-white shadow-black/20"
                      )}
                    >
                      {isLiability ? (
                        <CreditCard size={18} />
                      ) : (
                        <ArrowDownLeft size={18} />
                      )}
                      {isLiability ? "Make Payment" : "Add Funds"}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      className="bg-[#F2F2F7] text-black py-3.5 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2"
                    >
                      {isLiability ? (
                        <History size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}
                      {isLiability ? "History" : "Withdraw"}
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Wealth/Debt Visualizer */}
              <div className="mx-5 mt-6 mb-2">
                <h3 className="text-[13px] font-semibold text-black/40 uppercase tracking-widest mb-3 ml-1">
                  {isLiability ? "Road to Freedom" : "Performance"}
                </h3>

                {isLiability ? (
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-black/[0.04]">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-[13px] text-black/50 mb-1">
                          Paid Off
                        </p>
                        <p className="text-xl font-bold text-[#34C759]">
                          {liabilityProgress.toFixed(0)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] text-black/50 mb-1">
                          Remaining
                        </p>
                        <p className="text-xl font-bold text-[#FF3B30]">
                          ₱{account.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="h-3 bg-[#F2F2F7] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${liabilityProgress}%` }}
                        transition={{ duration: 1, ease: "circOut" }}
                        className="h-full bg-gradient-to-r from-[#34C759] to-[#22C55E]"
                      />
                    </div>
                    <p className="text-center text-[12px] text-black/40 mt-3 font-medium">
                      {originalLoanEstimate > 0
                        ? `You've paid ₱${(
                            originalLoanEstimate - account.amount
                          ).toLocaleString()} so far!`
                        : "Make your first payment to start tracking progress."}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-black/[0.04] h-[180px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#34C759]/10 flex items-center justify-center">
                          <TrendingUp size={16} className="text-[#34C759]" />
                        </div>
                        <div>
                          <p className="text-[13px] text-black/50">
                            This Month
                          </p>
                          <p className="text-[15px] font-bold text-[#34C759]">
                            +{Math.floor(Math.random() * 15)}%
                          </p>
                        </div>
                      </div>
                      <div className="bg-[#F2F2F7] px-3 py-1 rounded-full text-[12px] font-medium text-black/60">
                        7 Days
                      </div>
                    </div>

                    <div className="flex-1 w-full -ml-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient
                              id="colorValue"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor={isLiability ? "#FF3B30" : "#34C759"}
                                stopOpacity={0.1}
                              />
                              <stop
                                offset="95%"
                                stopColor={isLiability ? "#FF3B30" : "#34C759"}
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <Tooltip cursor={false} content={<></>} />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke={isLiability ? "#FF3B30" : "#34C759"}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                            animationDuration={1500}
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
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-black/[0.04]">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet size={16} className="text-[#007AFF]" />
                    <p className="text-[12px] font-semibold text-black/50 uppercase">
                      Total In
                    </p>
                  </div>
                  <p className="text-[17px] font-bold text-black">
                    ₱{totalIn.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-black/[0.04]">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 size={16} className="text-[#FF9500]" />
                    <p className="text-[12px] font-semibold text-black/50 uppercase">
                      Total Out
                    </p>
                  </div>
                  <p className="text-[17px] font-bold text-black">
                    ₱{totalOut.toLocaleString()}
                  </p>
                </div>
              </div>

              <h3 className="text-[13px] font-semibold text-black/40 uppercase tracking-widest mb-3 ml-1">
                Latest Activity
              </h3>
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl shadow-sm border border-black/[0.04] overflow-hidden"
              >
                {accountTransactions.length > 0 ? (
                  accountTransactions.map((t, i) => (
                    <motion.div
                      key={t.id}
                      id={`tx-${t.id}`}
                      variants={itemVariants}
                      whileTap={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                      className={clsx(
                        "flex items-center p-4 border-b border-black/[0.04] last:border-0 cursor-pointer transition-colors",
                        t.id === highlightTransactionId
                          ? "bg-yellow-100/50"
                          : ""
                      )}
                    >
                      <div
                        className={clsx(
                          "w-10 h-10 rounded-full flex items-center justify-center text-lg mr-3 shrink-0",
                          t.type === "deposit"
                            ? "bg-[#34C759]/10"
                            : "bg-[rgba(120,120,128,0.08)]"
                        )}
                      >
                        {t.type === "deposit" ? "💰" : "💸"}
                      </div>
                      <div className="flex-1">
                        <p className="text-[15px] font-semibold text-black">
                          {t.note || t.location || "Transaction"}
                        </p>
                        <p className="text-[13px] text-black/40">
                          {new Date(t.date).toLocaleDateString()}
                        </p>
                      </div>
                      <p
                        className={clsx(
                          "text-[15px] font-bold tabular-nums",
                          t.type === "deposit" ? "text-[#34C759]" : "text-black"
                        )}
                      >
                        {t.type === "deposit" ? "+" : "-"}₱
                        {t.amount.toLocaleString()}
                      </p>
                    </motion.div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-black/30 font-medium">
                      No transactions yet
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
