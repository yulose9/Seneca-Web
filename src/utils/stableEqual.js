/**
 * Structural equality that ignores object key order. Firestore returns map
 * keys sorted while local state keeps insertion order, so a plain
 * JSON.stringify comparison reports phantom changes.
 */
export const stableStringify = (value) =>
  JSON.stringify(value ?? null, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.keys(v).sort().reduce((acc, k) => ((acc[k] = v[k]), acc), {})
      : v,
  );

export const isEqual = (a, b) => stableStringify(a) === stableStringify(b);
