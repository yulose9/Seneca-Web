/**
 * Streak rules over { "YYYY-MM-DD": boolean } histories (Manila calendar days).
 */
import { addDays, getPhDateKey } from "./timeUtils";

/**
 * Study streak: consecutive `true` days ending today. Today may still be
 * unanswered; a `false` day, or any earlier unanswered day, ends it.
 */
export const studyStreak = (history = {}, today = getPhDateKey()) => {
  let streak = 0;
  for (let i = 0, key = today; i < 365; i++, key = addDays(key, -1)) {
    if (history[key] === true) streak++;
    else if (history[key] === false || i > 0) break;
  }
  return streak;
};

/** Goal streak: consecutive `true` days ending today, or yesterday if today isn't done yet. */
export const goalStreak = (history = {}, today = getPhDateKey()) => {
  let key = history[today] === true ? today : addDays(today, -1);
  let streak = 0;
  while (history[key] === true) {
    streak++;
    key = addDays(key, -1);
  }
  return streak;
};
