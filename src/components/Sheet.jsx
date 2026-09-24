import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FADE, SHEET_EXIT, SHEET_SPRING } from "../constants/motion";

/**
 * Bottom sheet chrome: presence animation, tap-to-close backdrop, slide-up panel
 * (SHEET_SPRING in, softer SHEET_EXIT out), dialog semantics and Escape to close.
 *
 * The panel's look (position, height, background, radius, handle, header) is the
 * caller's: pass it through `className` and `children`.
 *
 *   <Sheet open={isOpen} onClose={close} zIndex={50} label="Add task"
 *          className="fixed bottom-0 inset-x-0 bg-[#F2F2F7] rounded-t-[14px] max-h-[92vh]">
 *     …
 *   </Sheet>
 *
 * Backdrop and panel share `zIndex`; the panel renders later so it sits on top.
 */
export default function Sheet({
  open,
  onClose,
  className,
  backdropClassName = "fixed inset-0 bg-black/40 backdrop-blur-sm",
  zIndex = 50,
  label,
  children,
}) {
  // Latest onClose without re-binding the key listener every render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onCloseRef.current?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
            onClick={() => onCloseRef.current?.()}
            className={backdropClassName}
            style={{ zIndex }}
          />
          <motion.div
            key="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: SHEET_EXIT }}
            transition={SHEET_SPRING}
            className={className}
            style={{ zIndex }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
