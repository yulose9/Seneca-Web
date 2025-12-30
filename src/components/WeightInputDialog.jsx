import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

// iOS Clock-style Wheel Picker (Light Mode)
function ClockStylePicker({ items, value, onChange, label }) {
  const containerRef = useRef(null);
  const scrollTimeout = useRef(null);

  // Initialize scroll position
  useEffect(() => {
    if (containerRef.current) {
      const index = items.indexOf(value);
      if (index !== -1) {
        containerRef.current.scrollTop = index * ITEM_HEIGHT;
      }
    }
  }, []);

  const handleScroll = (e) => {
    clearTimeout(scrollTimeout.current);

    const index = Math.round(e.target.scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    if (items[clampedIndex] !== value) {
      onChange(items[clampedIndex]);
    }

    // Snap after scrolling stops
    scrollTimeout.current = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: clampedIndex * ITEM_HEIGHT,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  const centerPadding = ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;

  return (
    <div className="relative flex items-center">
      {/* Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[250px] w-[80px] overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{
          paddingTop: centerPadding,
          paddingBottom: centerPadding,
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        {items.map((item, i) => {
          const isSelected = item === value;
          return (
            <div
              key={i}
              className="h-[50px] flex items-center justify-center snap-center"
            >
              <span
                className={`text-[28px] font-light transition-all duration-150 ${isSelected ? "text-black scale-105" : "text-black/25 scale-90"
                  }`}
              >
                {String(item).padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Label (kg) */}
      {label && (
        <span className="text-[17px] font-medium text-black/50 ml-1">
          {label}
        </span>
      )}
    </div>
  );
}

export default function WeightInputDialog({
  visible,
  onClose,
  onSave,
  currentWeight,
}) {
  const [integerPart, setIntegerPart] = useState(90);
  const [decimalPart, setDecimalPart] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Initialize input with current value when opening
  useEffect(() => {
    if (visible && currentWeight) {
      const val = parseFloat(currentWeight);
      setIntegerPart(Math.floor(val));
      setDecimalPart(Math.round((val % 1) * 10));
    }
  }, [visible, currentWeight]);

  const handleSave = () => {
    const fullWeight = parseFloat(`${integerPart}.${decimalPart}`);
    onSave(fullWeight);
    onClose();
  };

  const content = (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999]"
          />

          {/* Bottom Sheet - iOS Light Style */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#F2F2F7] rounded-t-[20px] overflow-hidden"
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-[5px] bg-[rgba(60,60,67,0.3)] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 border-b border-black/[0.08]">
              <button
                onClick={onClose}
                className="text-[17px] text-[#007AFF] font-normal active:opacity-50"
              >
                Cancel
              </button>
              <h2 className="text-[17px] font-semibold text-black">
                Log Weight
              </h2>
              <button
                onClick={handleSave}
                className="text-[17px] text-[#007AFF] font-semibold active:opacity-50"
              >
                Save
              </button>
            </div>

            {/* Picker Area - Extra padding to cover bottom nav */}
            <div
              className="relative px-6 pt-4"
              style={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))" }}
            >
              {/* Selection Highlight Bar */}
              <div className="absolute left-4 right-4 top-[calc(50%-60px)] -translate-y-1/2 h-[50px] bg-black/[0.06] rounded-xl pointer-events-none z-0" />

              {/* Gradient Masks */}
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#F2F2F7] via-[#F2F2F7]/90 to-transparent pointer-events-none z-10" />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#F2F2F7] via-[#F2F2F7]/90 to-transparent pointer-events-none z-10" />

              {/* Wheel Pickers */}
              <div className="flex justify-center items-center gap-0 relative z-5">
                <ClockStylePicker
                  items={Array.from({ length: 171 }, (_, i) => i + 30)}
                  value={integerPart}
                  onChange={setIntegerPart}
                />
                <span className="text-[28px] font-light text-black mx-1">
                  .
                </span>
                <ClockStylePicker
                  items={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                  value={decimalPart}
                  onChange={setDecimalPart}
                  label="kg"
                />
              </div>

              {/* Current Weight Display */}
              <div className="text-center mt-8 pb-12">
                <p className="text-[13px] text-black/40 uppercase tracking-wide mb-1">
                  Current Weight
                </p>
                <p className="text-[48px] font-thin text-[#007AFF] tabular-nums">
                  {integerPart}.{decimalPart}
                  <span className="text-[24px] font-normal text-black/30 ml-1">
                    kg
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;

  return createPortal(content, document.body);
}
