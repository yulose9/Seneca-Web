/**
 * timeUtils.js
 *
 * Timezone-aware date helpers pinned to Asia/Manila (UTC+8, Philippine Standard Time).
 *
 * All "today" logic must use these helpers so that the day boundary resets at
 * midnight Manila time on every device regardless of the device's local clock.
 */

const PH_TIMEZONE = "Asia/Manila";

/**
 * Return the current Philippine Standard Time date as a "YYYY-MM-DD" string.
 * Works correctly on any device timezone because it uses Intl.DateTimeFormat
 * to convert the instant to Manila civil time.
 */
export const getPhDateKey = () => {
  const now = new Date();
  // Intl gives us a locale string; we reformat it to YYYY-MM-DD
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

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
