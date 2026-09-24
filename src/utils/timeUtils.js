/**
 * timeUtils.js
 *
 * Timezone-aware date helpers pinned to Asia/Manila (UTC+8, Philippine Standard Time).
 *
 * All "today" logic must use these helpers so that the day boundary resets at
 * midnight Manila time on every device regardless of the device's local clock.
 */

const PH_TIMEZONE = "Asia/Manila";

const phKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PH_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Manila calendar day ("YYYY-MM-DD") that an instant falls on.
 * Use for anything stamped "now": task completion, entry dates, history keys.
 * Never use `toISOString().split("T")[0]` — that is the UTC day, which is
 * still "yesterday" in Manila until 08:00.
 */
export const toDateKey = (date = new Date()) => {
  const parts = phKeyFormatter.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

/** Today's Manila calendar day. */
export const getPhDateKey = () => toDateKey(new Date());

/** Key arithmetic, timezone-free: addDays("2026-03-01", -1) → "2026-02-28". */
export const addDays = (key, days) => {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
};

/**
 * Calendar-grid helpers. A key rendered as a Date at LOCAL midnight (for
 * getDay()/getDate()/labels), and back. These two are inverses; don't mix them
 * with toDateKey(), which converts an instant to Manila.
 */
export const parseDateKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const calendarDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * Return a Date object representing midnight (00:00:00.000) of the NEXT day
 * in Philippine time.  Use this to schedule the day-rollover reset timer.
 */
export const getNextMidnightPH = () => {
  const now = new Date();

  // Current hour/minute/second in PH timezone
  const phNow = new Date(
    now.toLocaleString("en-US", { timeZone: PH_TIMEZONE })
  );
  const msUntilMidnight =
    new Date(
      phNow.getFullYear(),
      phNow.getMonth(),
      phNow.getDate() + 1, // next day
      0, 0, 0, 0
    ) - phNow;

  return new Date(now.getTime() + msUntilMidnight);
};

/**
 * Calculate milliseconds until next midnight Philippine time.
 */
export const msUntilMidnightPH = () => {
  return getNextMidnightPH() - new Date();
};
