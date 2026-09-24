/**
 * Seneca Motion System
 * Shared easing, springs and press feedback so every surface moves the same way.
 * Mirrors the CSS custom properties in index.css (--ease-out, --ease-in-out, --ease-drawer).
 */

// Strong ease-out for entering / responsive UI
export const EASE_OUT = [0.23, 1, 0.32, 1];
// On-screen movement / morphing
export const EASE_IN_OUT = [0.77, 0, 0.175, 1];
// iOS sheet / drawer curve
export const EASE_DRAWER = [0.32, 0.72, 0, 1];

// Bottom sheets & drawers: critically damped, no overshoot
export const SHEET_SPRING = { type: "spring", duration: 0.45, bounce: 0 };
// Sheet exits are softer and quicker than enters
export const SHEET_EXIT = { duration: 0.25, ease: EASE_DRAWER };

// Centered dialogs / popovers
export const DIALOG_SPRING = { type: "spring", duration: 0.3, bounce: 0 };

// Layout shifts, reorders, height changes
export const LAYOUT_SPRING = { type: "spring", duration: 0.35, bounce: 0 };

// Contextual icon swaps (check ↔ circle, play ↔ pause…)
export const ICON_SPRING = { type: "spring", duration: 0.3, bounce: 0 };
export const ICON_ENTER = { opacity: 0, scale: 0.25, filter: "blur(4px)" };
export const ICON_VISIBLE = { opacity: 1, scale: 1, filter: "blur(0px)" };

// Backdrop fades
export const FADE = { duration: 0.2, ease: EASE_OUT };

// Press feedback — always 0.96
export const PRESS_SCALE = 0.96;
export const TAP = { scale: PRESS_SCALE };
export const TAP_TRANSITION = { type: "spring", duration: 0.16, bounce: 0 };
