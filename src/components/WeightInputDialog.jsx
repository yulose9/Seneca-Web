import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { useWebHaptics } from "web-haptics/react";

import Sheet from "./Sheet";

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

// iOS Clock-style Wheel Picker (Light Mode)
function ClockStylePicker({ items, value, onChange, label }) {
  const containerRef = useRef(null);
  const scrollTimeout = useRef(null);
  const reduceMotion = useReducedMotion();

  // Keep scroll position in sync with value. The parent seeds the value from
  // currentWeight after this mounts, so a mount-only scroll would sit on the
  // stale default. Values produced by the user's own scroll are always within
  // half an item of scrollTop, so this never fights an active drag.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const index = items.indexOf(value);
    if (index !== -1 && Math.abs(el.scrollTop - index * ITEM_HEIGHT) > ITEM_HEIGHT / 2) {
      el.scrollTop = index * ITEM_HEIGHT;
    }
  }, [items, value]);

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
          behavior: reduceMotion ? "auto" : "smooth",
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
                className={`inline-block text-title-1 font-light tabular-nums transition-[scale,color] duration-150 ease-out ${isSelected ? "text-ink scale-105" : "text-ink-3 scale-90"
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
        <span className="text-body font-medium text-ink-2 ml-1">
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
  const haptic = useWebHaptics();
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
    haptic.trigger("success");
    const fullWeight = parseFloat(`${integerPart}.${decimalPart}`);
    onSave(fullWeight);
    onClose();
  };

  const content = (
    <Sheet
      open={visible}
      onClose={onClose}
      zIndex={9999}
      label="Update weight"
      className="fixed bottom-0 left-0 right-0 bg-canvas rounded-t-sheet overflow-hidden"
    >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-[5px] bg-separator rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-separator">
          <button
            onClick={onClose}
            className="text-body text-accent font-normal active:opacity-50"
          >
            Cancel
          </button>
          <h2 className="text-body font-semibold text-ink">
            Log Weight
          </h2>
          <button
            onClick={handleSave}
            className="text-body text-accent font-semibold active:opacity-50"
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
          <div className="absolute left-4 right-4 top-[calc(50%-60px)] -translate-y-1/2 h-[50px] bg-fill rounded-xl pointer-events-none z-0" />

          {/* Gradient Masks */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-canvas via-canvas/90 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas via-canvas/90 to-transparent pointer-events-none z-10" />

          {/* Wheel Pickers */}
          <div className="flex justify-center items-center gap-0 relative z-5">
            <ClockStylePicker
              items={Array.from({ length: 171 }, (_, i) => i + 30)}
              value={integerPart}
              onChange={(val) => {
                haptic.trigger("selection");
                setIntegerPart(val);
              }}
            />
            <span className="text-title-1 font-light text-ink mx-1">
              .
            </span>
            <ClockStylePicker
              items={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
              value={decimalPart}
              onChange={(val) => {
                haptic.trigger("selection");
                setDecimalPart(val);
              }}
              label="kg"
            />
          </div>

          {/* Current Weight Display */}
          <div className="text-center mt-8 pb-12">
            <p className="text-footnote font-medium text-ink-2 mb-1">
              Current weight
            </p>
            <p className="text-display font-thin text-accent tabular-nums">
              {integerPart}.{decimalPart}
              <span className="text-title-2 font-normal text-ink-3 ml-1">
                kg
              </span>
            </p>
          </div>
        </div>
    </Sheet>
  );

  if (!mounted) return null;

  return createPortal(content, document.body);
}
