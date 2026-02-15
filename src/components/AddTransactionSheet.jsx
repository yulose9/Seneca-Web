import clsx from "clsx";
import {
  animate,
  AnimatePresence,
  motion,
  useAnimation,
  useMotionValue,
} from "framer-motion";
import { Check, Loader2, MapPin, X } from "lucide-react";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

// iOS-style Selection Row
const SelectionRow = ({
  icon,
  label,
  sublabel,
  isSelected,
  onClick,
  color = "text-black",
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileTap={{ backgroundColor: "rgba(0,0,0,0.04)" }}
    className="w-full flex items-center p-4 border-b border-[rgba(60,60,67,0.12)] last:border-b-0"
  >
    <div
      className={clsx(
        "w-10 h-10 rounded-full flex items-center justify-center text-lg mr-3 shrink-0",
        isSelected ? "bg-[#007AFF]/10" : "bg-[rgba(120,120,128,0.08)]",
      )}
    >
      {icon}
    </div>
    <div className="flex-1 text-left">
      <p className={clsx("text-[16px] font-semibold", color)}>{label}</p>
      {sublabel && (
        <p className="text-[13px] text-[rgba(60,60,67,0.6)]">{sublabel}</p>
      )}
    </div>
    {isSelected && <Check size={20} className="text-[#007AFF]" />}
  </motion.button>
);

// Rolling Number Component
const RollingNumber = ({ value, displayValue, prefix = "", className }) => {
  const ref = useRef(null);
  const motionValue = useMotionValue(value);

  // Initial render text
  const initialText = `${prefix}${displayValue}`;

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.5,
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (latest) => {
        if (ref.current) {
          if (Math.abs(latest - value) < 0.5) {
            ref.current.textContent = `${prefix}${displayValue}`;
          } else {
            ref.current.textContent = `${prefix}${Math.round(
              latest,
            ).toLocaleString()}`;
          }
        }
      },
      onComplete: () => {
        if (ref.current) ref.current.textContent = `${prefix}${displayValue}`;
      },
    });
    return () => controls.stop();
  }, [value, displayValue, prefix]); // Re-run if value changes

  return (
    <span ref={ref} className={className}>
      {initialText}
    </span>
  );
};

// Number Pad Component
const NumberPad = ({ value, onChange, onClear, maxLength = 10 }) => {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  const handlePress = (key) => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }

    if (key === "⌫") {
      onChange(value.slice(0, -1));
    } else if (key === ".") {
      if (!value.includes(".")) {
        onChange(value + key);
      }
    } else {
      if (value.length < maxLength) {
        if (value === "0" && key !== ".") {
          onChange(key);
        } else {
          onChange(value + key);
        }
      }
    }
  };

  const handleTouchStart = (key) => {
    if (key === "⌫") {
      isLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        onClear && onClear();
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2 p-4">
      {keys.map((key) => (
        <motion.button
          key={key}
          type="button"
          whileTap={{ scale: 0.9, backgroundColor: "rgba(0,0,0,0.1)" }}
          onClick={() => handlePress(key)}
          onTouchStart={() => handleTouchStart(key)}
          onTouchEnd={handleTouchEnd}
          onMouseDown={() => handleTouchStart(key)}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          className="h-12 rounded-xl bg-[rgba(120,120,128,0.08)] text-[22px] font-semibold text-black flex items-center justify-center select-none"
          style={{ touchAction: "manipulation" }}
        >
          {key}
        </motion.button>
      ))}
    </div>
  );
};

// Animated Height Container
const AnimatedHeight = ({ children, className }) => {
  const containerRef = useRef(null);
  const [height, setHeight] = useState("auto");

  useLayoutEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setHeight(entry.contentRect.height);
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  return (
    <motion.div
      animate={{ height }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 40,
        mass: 1,
      }}
      className={clsx("overflow-hidden", className)}
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
};

export default function AddTransactionSheet({
  isOpen,
  visible,
  onClose,
  currentCategory = "All Assets",
  savingsAccounts = [],
  investmentAccounts = [],
  liabilities = [],
  accounts = [],
  onAddTransaction,
  onAdd,
}) {
  const isSheetOpen = isOpen ?? visible ?? false;
  const handleAddTransaction = onAddTransaction ?? onAdd ?? (() => {});

  const derivedSavingsAccounts =
    savingsAccounts.length > 0
      ? savingsAccounts
      : accounts.filter((a) => a.category === "Savings");
  const derivedInvestmentAccounts =
    investmentAccounts.length > 0
      ? investmentAccounts
      : accounts.filter((a) => a.category === "Investments");

  const [step, setStep] = useState("type");
  const [transactionType, setTransactionType] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Paste Modal State
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteValue, setPasteValue] = useState("");

  const amountControls = useAnimation();

  useEffect(() => {
    if (isSheetOpen) {
      if (currentCategory === "Savings") {
        setTransactionType("savings");
        setStep("account");
      } else if (currentCategory === "Investments") {
        setTransactionType("investment");
        setStep("account");
      } else if (currentCategory === "Liabilities") {
        setTransactionType("liability");
        setStep("account");
      } else {
        setTransactionType(null);
        setStep("type");
      }
      setSelectedAccount(null);
      setAmount("");
      setNote("");
      setLocation(null);
      setLocationName("");
    }
  }, [isSheetOpen, currentCategory]);

  // Auto-fetch location removed to support Safari's user-gesture requirement.
  // User must tap the button manually.

  const getLocation = async () => {
    if (!navigator.geolocation) {
      setLocationName("Location not available");
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          );
          const data = await response.json();
          const address = data.address;
          const shortLocation =
            address?.suburb ||
            address?.neighbourhood ||
            address?.city_district ||
            address?.city ||
            address?.town ||
            "Unknown";
          const city =
            address?.city || address?.town || address?.municipality || "";
          setLocationName(city ? `${shortLocation}, ${city}` : shortLocation);
        } catch {
          setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setIsGettingLocation(false);
      },
      () => {
        setLocationName("Location access denied. Tap to retry ↻");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleTypeSelect = (type) => {
    setTransactionType(type);
    setStep("account");
  };

  const handleAccountSelect = (account) => {
    setSelectedAccount(account);
    setStep("amount");
  };

  const handleQuickAdd = (value) => {
    const currentVal = parseFloat(amount || "0");
    setAmount((currentVal + value).toString());
  };

  const processText = (text) => {
    if (!text) return;
    const clean = text.replace(/,/g, "");
    const match = clean.match(/[\d]*\.?[\d]+/);
    if (match) setAmount(match[0]);
  };

  const handlePaste = async () => {
    try {
      // Try standard Clipboard API (works on HTTPS/Localhost)
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        processText(text);
      } else {
        throw new Error("Clipboard unavailable");
      }
    } catch (err) {
      // Fallback: Open custom modal
      setPasteValue("");
      setShowPasteModal(true);
    }
  };

  const confirmPaste = () => {
    processText(pasteValue);
    setShowPasteModal(false);
  };

  const handleClearAmount = () => {
    setAmount("");
  };

  const handleSubmit = () => {
    if (!selectedAccount || !amount || parseFloat(amount) <= 0) return;

    const transaction = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: transactionType === "liability" ? "payment" : "deposit",
      accountId: selectedAccount.id,
      bank: selectedAccount.name,
      location: locationName || "Unknown Location",
      gps: location,
      amount: parseFloat(amount),
      note: note || null,
      category:
        transactionType === "savings"
          ? "Savings"
          : transactionType === "investment"
            ? "Investments"
            : transactionType === "liability"
              ? "Liabilities"
              : transactionType,
    };

    handleAddTransaction(transaction);
    setStep("success");

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const getAccountsForType = () => {
    switch (transactionType) {
      case "savings":
        return derivedSavingsAccounts;
      case "investment":
        return derivedInvestmentAccounts;
      case "liability":
        return liabilities;
      default:
        return [];
    }
  };

  const getTitle = () => {
    if (step === "type") return "Add Transaction";
    if (step === "account") {
      if (transactionType === "liability") return "Pay Liability";
      return `Add to ${
        transactionType === "savings" ? "Savings" : "Investment"
      }`;
    }
    if (step === "amount") {
      if (transactionType === "liability")
        return `Pay ${selectedAccount?.name}`;
      return `Add to ${selectedAccount?.name}`;
    }
    if (step === "success") return "Complete";
    return "Add Transaction";
  };

  const canGoBack = () => {
    if (step === "type") return false;
    if (step === "account" && currentCategory !== "All Assets") return false;
    return true;
  };

  const handleBack = () => {
    if (step === "amount") setStep("account");
    else if (step === "account") setStep("type");
  };

  return (
    <AnimatePresence>
      {isSheetOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400]"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl z-[401] overflow-hidden"
            style={{ maxHeight: "90vh" }}
          >
            {/* Handle */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-pointer"
              onClick={onClose}
            >
              <div className="w-12 h-1.5 rounded-full bg-[rgba(60,60,67,0.3)]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 border-b border-[rgba(60,60,67,0.12)]">
              <div className="w-12">
                {canGoBack() && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleBack}
                    className="text-[17px] text-[#007AFF] font-medium"
                  >
                    Back
                  </motion.button>
                )}
              </div>
              <motion.h2
                key={step + transactionType}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[17px] font-semibold text-black"
              >
                {getTitle()}
              </motion.h2>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[rgba(120,120,128,0.12)] flex items-center justify-center"
              >
                <X size={18} className="text-[rgba(60,60,67,0.6)]" />
              </motion.button>
            </div>

            {/* Content with animated height */}
            <AnimatedHeight>
              <AnimatePresence mode="wait" initial={false}>
                {/* Step 1: Select Type */}
                {step === "type" && (
                  <motion.div
                    key="type"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="p-5"
                  >
                    <p className="text-[15px] text-[rgba(60,60,67,0.6)] mb-4">
                      What type of transaction would you like to add?
                    </p>

                    <div className="bg-white rounded-xl border border-[rgba(60,60,67,0.12)] overflow-hidden">
                      <SelectionRow
                        icon="💰"
                        label="Add to Savings"
                        sublabel="Deposit to Maya Bank or GCash"
                        onClick={() => handleTypeSelect("savings")}
                      />
                      <SelectionRow
                        icon="📈"
                        label="Add to Investment"
                        sublabel="Deposit to Trading212 or other"
                        onClick={() => handleTypeSelect("investment")}
                      />
                      <SelectionRow
                        icon="💸"
                        label="Pay Liability"
                        sublabel="Make a payment towards a debt"
                        color="text-[#FF3B30]"
                        onClick={() => handleTypeSelect("liability")}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Select Account */}
                {step === "account" && (
                  <motion.div
                    key="account"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="p-5"
                  >
                    <p className="text-[15px] text-[rgba(60,60,67,0.6)] mb-4">
                      {transactionType === "liability"
                        ? "Select which liability to pay:"
                        : "Select account to add funds:"}
                    </p>

                    <div className="bg-white rounded-xl border border-[rgba(60,60,67,0.12)] overflow-hidden">
                      {getAccountsForType().map((account) => (
                        <SelectionRow
                          key={account.id}
                          icon={account.icon}
                          label={account.name}
                          sublabel={
                            transactionType === "liability"
                              ? `Outstanding: ₱${account.amount.toLocaleString()}`
                              : account.platform
                          }
                          isSelected={selectedAccount?.id === account.id}
                          onClick={() => handleAccountSelect(account)}
                          color={
                            transactionType === "liability"
                              ? "text-[#FF3B30]"
                              : "text-black"
                          }
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Enter Amount */}
                {step === "amount" && (
                  <motion.div
                    key="amount"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="flex flex-col"
                  >
                    {/* Amount Display */}
                    <div className="text-center py-5 px-5">
                      <p className="text-[13px] text-[rgba(60,60,67,0.6)] mb-1 uppercase tracking-wide">
                        {transactionType === "liability"
                          ? "Payment Amount"
                          : "Deposit Amount"}
                      </p>
                      <div className="flex items-center justify-center">
                        <RollingNumber
                          value={parseFloat(amount) || 0}
                          displayValue={amount || "0"}
                          prefix={transactionType === "liability" ? "-" : "+"}
                          className={clsx(
                            "text-[42px] font-bold tabular-nums select-none",
                            transactionType === "liability"
                              ? "text-[#FF3B30]"
                              : "text-[#34C759]",
                          )}
                        />
                      </div>
                      {transactionType === "liability" && selectedAccount && (
                        <p className="text-[14px] text-[rgba(60,60,67,0.6)] mt-1">
                          Remaining: ₱
                          {Math.max(
                            0,
                            selectedAccount.amount - (parseFloat(amount) || 0),
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* Location & Note */}
                    <div className="px-5 space-y-2 mb-2">
                      <div
                        onClick={getLocation}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[rgba(120,120,128,0.08)] rounded-xl cursor-pointer active:scale-95 transition-transform"
                      >
                        {isGettingLocation ? (
                          <Loader2
                            size={14}
                            className="text-[#007AFF] animate-spin"
                          />
                        ) : (
                          <MapPin size={14} className="text-[#007AFF]" />
                        )}
                        <span className="text-[14px] text-[rgba(60,60,67,0.6)]">
                          {isGettingLocation
                            ? "Getting location..."
                            : locationName || "Tap to add location (Optional)"}
                        </span>
                      </div>

                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a note (optional)"
                        className="w-full px-4 py-2.5 bg-[rgba(120,120,128,0.08)] rounded-xl text-[14px] text-black placeholder:text-[rgba(60,60,67,0.3)] outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                      />
                    </div>

                    <div className="px-5 mb-2">
                      <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 no-scrollbar">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={handlePaste}
                          className="shrink-0 h-9 px-4 rounded-full bg-[rgba(118,118,128,0.12)] text-[14px] font-semibold text-black/80 flex items-center justify-center border border-[rgba(0,0,0,0.02)]"
                        >
                          Paste
                        </motion.button>
                        {[5, 10, 50, 100, 1000, 5000].map((val) => (
                          <motion.button
                            key={val}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleQuickAdd(val)}
                            className="shrink-0 h-9 px-4 rounded-full bg-[rgba(120,120,128,0.08)] text-[14px] font-semibold text-black/80 flex items-center justify-center border border-[rgba(0,0,0,0.02)]"
                          >
                            +{val.toLocaleString()}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Number Pad */}
                    <NumberPad
                      value={amount}
                      onChange={setAmount}
                      onClear={handleClearAmount}
                    />

                    {/* Submit Button */}
                    <div className="px-5 pb-8 pt-2">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmit}
                        disabled={!amount || parseFloat(amount) <= 0}
                        className={clsx(
                          "w-full py-3.5 rounded-xl font-semibold text-[16px] transition-all",
                          amount && parseFloat(amount) > 0
                            ? transactionType === "liability"
                              ? "bg-[#FF3B30] text-white shadow-lg shadow-[#FF3B30]/25"
                              : "bg-[#34C759] text-white shadow-lg shadow-[#34C759]/25"
                            : "bg-[rgba(120,120,128,0.12)] text-[rgba(60,60,67,0.3)]",
                        )}
                      >
                        {transactionType === "liability"
                          ? "Confirm Payment"
                          : "Add Funds"}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {step === "success" && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                    className="p-10 flex flex-col items-center justify-center text-center min-h-[300px]"
                  >
                    <div className="w-24 h-24 bg-[#34C759] rounded-full flex items-center justify-center mb-6 shadow-xl shadow-[#34C759]/40">
                      <motion.svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{
                          duration: 0.6,
                          ease: "easeOut",
                          delay: 0.2,
                        }}
                      >
                        <motion.path d="M20 6L9 17l-5-5" />
                      </motion.svg>
                    </div>
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-[24px] font-bold text-black mb-2 tracking-tight"
                    >
                      {transactionType === "liability"
                        ? "Payment Verified"
                        : "Funds Added"}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-[17px] text-[rgba(60,60,67,0.6)] font-medium"
                    >
                      {transactionType === "liability"
                        ? `Successfully paid ₱${parseFloat(
                            amount,
                          ).toLocaleString()}`
                        : `Successfully deposited ₱${parseFloat(
                            amount,
                          ).toLocaleString()}`}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </AnimatedHeight>
          </motion.div>
        </>
      )}

      {/* Custom Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPasteModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl space-y-4"
          >
            <div className="text-center">
              <h3 className="text-[17px] font-semibold mb-1">Paste Amount</h3>
              <p className="text-[13px] text-gray-500">
                Enter or paste the amount below
              </p>
            </div>
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-[#007AFF] transition-all"
              placeholder="0.00"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="flex-1 py-2.5 rounded-xl font-medium bg-gray-100 text-gray-600 active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={confirmPaste}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-[#007AFF] text-white active:scale-95 transition-transform"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
