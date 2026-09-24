/**
 * Everything the app syncs across devices, declared once.
 *
 * Each hook is a field of users/{uid}/global_data/{doc}. It behaves like
 * useState: [value, setValue]. Local changes are cached in localStorage and
 * written to Firestore (that field only); changes from other devices replace
 * the local value. `mergeDirty(local, cloud)` decides how edits that never
 * reached the server in a previous session are combined with the cloud copy.
 *
 * The Firestore field names and localStorage keys below are live data —
 * renaming one orphans existing users' data.
 */
import { defineSyncedField } from "../hooks/useSyncedField";

// Arrays of { id } records: cloud order, local version wins on conflict,
// local-only records kept. (Offline deletions can't be told apart from
// "never synced", so they may reappear — there are no tombstones.)
const mergeById = (local, cloud = []) => [
  ...cloud.map((c) => local.find((l) => l.id === c.id) || c),
  ...local.filter((l) => !cloud.some((c) => c.id === l.id)),
];

// { key: value } maps: union, local wins
const mergeMap = (local, cloud) => ({ ...(cloud || {}), ...local });

// { outerKey: { innerKey: value } }: union per outer key, local wins
const mergeNestedMap = (local, cloud = {}) => {
  const merged = {};
  new Set([...Object.keys(cloud), ...Object.keys(local)]).forEach((k) => {
    merged[k] = { ...(cloud[k] || {}), ...(local[k] || {}) };
  });
  return merged;
};

// ─── Study goal ──────────────────────────────────────────────────────────────
export const useActiveStudyGoal = defineSyncedField("studyGoal", "activeStudyGoal", {
  initial: null,
  storageKey: "study_goal_active",
});
export const useStudyHistory = defineSyncedField("studyGoal", "studyHistory", {
  initial: {},
  storageKey: "study_goal_history",
  mergeDirty: mergeMap,
});

// ─── Personal goals ──────────────────────────────────────────────────────────
export const usePersonalGoalDefinitions = defineSyncedField("personalGoals", "goals", {
  initial: {},
  storageKey: "personal_goals_config",
  mergeDirty: mergeMap,
});
export const usePersonalGoalHistory = defineSyncedField("personalGoals", "goalHistory", {
  initial: {},
  storageKey: "personal_goals_history",
  mergeDirty: mergeNestedMap,
});

// ─── Journal ─────────────────────────────────────────────────────────────────
export const useJournalEntries = defineSyncedField("journal", "entries", {
  initial: [],
  storageKey: "journal_entries",
  mergeDirty: (local, cloud) => mergeById(local, cloud).sort((a, b) => b.id - a.id),
});

// ─── Wealth ──────────────────────────────────────────────────────────────────
export const useWealthAssets = defineSyncedField("wealth", "assets", {
  initial: [],
  storageKey: "wealth_assets",
  mergeDirty: mergeById,
});
export const useWealthLiabilities = defineSyncedField("wealth", "liabilities", {
  initial: [],
  storageKey: "wealth_liabilities",
  mergeDirty: mergeById,
});
export const useWealthTransactions = defineSyncedField("wealth", "transactions", {
  initial: [],
  storageKey: "wealth_transactions",
  mergeDirty: (local, cloud) =>
    mergeById(local, cloud).sort((a, b) => new Date(b.date) - new Date(a.date)),
});
export const useWealthSearchHistory = defineSyncedField("wealth", "search_history", {
  initial: [],
  storageKey: "wealth_search_history",
});

// ─── Certifications ──────────────────────────────────────────────────────────
export const useCustomCertifications = defineSyncedField("certifications", "customCertifications", {
  initial: [],
  storageKey: "seneca_custom_certifications",
  mergeDirty: mergeById,
});
// Stored as the full domains list; Growth overlays its statuses onto the
// built-in catalog. First run on a device migrates the pre-domains
// `seneca_certification_statuses` map into a minimal domains-shaped list.
export const useCertificationDomains = defineSyncedField("certifications", "domains", {
  initial: () => {
    try {
      const legacy = JSON.parse(localStorage.getItem("seneca_certification_statuses") || "{}");
      return [{ modules: Object.entries(legacy).map(([name, status]) => ({ name, status })) }];
    } catch {
      return [];
    }
  },
  storageKey: "seneca_domains",
});
