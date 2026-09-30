import clsx from "clsx";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { Trash2 } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { LAYOUT_SPRING } from "../constants/motion";

const REVEAL = 80; // px the row slides left to reveal the delete action
const OPEN_DISTANCE = 40;
const OPEN_VELOCITY = 300;
const LONG_PRESS_MS = 500;
const LONG_PRESS_SLOP = 8;

/**
 * Swipe-left-to-delete row.
 * The content follows the finger (drag="x", direction locked so vertical scrolls
 * never open it); release decides open/closed from distance and flick velocity.
 * Also owns long-press (enter selection mode) and "tap while open closes".
 *
 * children: node, or ({ open }) => node
 * onClick: tap on the row (swallowed while open, which closes it instead)
 * onLongPress: held ~500ms without moving; cancelled by a drag
 * inset: delete action is an inset rounded button (cards) instead of a full-height strip
 * className / whileTap: applied to the sliding content
 */
export default function SwipeRow({
  children,
  onDelete,
  deleteLabel = "Delete",
  disabled = false,
  onLongPress,
  onClick,
  inset = false,
  whileTap,
  className,
}) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);
  const longPressTimer = useRef(null);
  const pressOrigin = useRef({ x: 0, y: 0 });
  const suppressClick = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const settle = useCallback(
    (isOpen) => {
      setOpen(isOpen);
      animate(
        x,
        isOpen ? -REVEAL : 0,
        reduceMotion ? { duration: 0 } : LAYOUT_SPRING,
      );
    },
    [x, reduceMotion],
  );

  // Entering selection mode (or unmounting) closes the row and drops any pending press.
  useEffect(() => {
    if (disabled) {
      clearLongPress();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      settle(false);
    }
  }, [disabled, clearLongPress, settle]);

  useEffect(() => clearLongPress, [clearLongPress]);

  const handlePointerDown = (e) => {
    suppressClick.current = false;
    if (disabled || !onLongPress || !e.isPrimary) return;
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      suppressClick.current = true;
      onLongPress();
      if (navigator.vibrate) navigator.vibrate(50);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e) => {
    if (!longPressTimer.current) return;
    const dx = e.clientX - pressOrigin.current.x;
    const dy = e.clientY - pressOrigin.current.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_SLOP) clearLongPress();
  };

  const handleDragStart = () => {
    clearLongPress();
    suppressClick.current = true;
  };

  const handleDragEnd = (_e, info) => {
    if (open) {
      const closing =
        info.offset.x > OPEN_DISTANCE || info.velocity.x > OPEN_VELOCITY;
      settle(!closing);
    } else {
      const opening =
        info.offset.x < -OPEN_DISTANCE || info.velocity.x < -OPEN_VELOCITY;
      settle(opening);
    }
  };

  const handleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (open) {
      settle(false);
      return;
    }
    onClick?.();
  };

  return (
    <div className="relative overflow-hidden">
      <div
        className={clsx(
          "absolute flex items-center justify-center",
          inset
            ? "right-2 top-2 bottom-2 w-[70px]"
            : "right-0 top-0 bottom-0 w-20 bg-negative",
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
            settle(false);
          }}
          aria-label={deleteLabel}
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
          className={clsx(
            "w-full h-full text-white flex items-center justify-center",
            inset &&
              "bg-negative rounded-xl shadow-card active:scale-[0.96] transition-transform duration-150 ease-out",
          )}
        >
          <Trash2 size={20} />
        </button>
      </div>

      <motion.div
        style={{ x }}
        drag={disabled ? false : "x"}
        dragDirectionLock
        dragConstraints={{ left: -REVEAL, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onClick={handleClick}
        whileTap={disabled || open ? undefined : whileTap}
        className={clsx("relative", className)}
      >
        {typeof children === "function" ? children({ open }) : children}
      </motion.div>
    </div>
  );
}
