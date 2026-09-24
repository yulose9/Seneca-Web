import { useSyncExternalStore } from "react";
import { getSyncedField } from "../services/syncedField";

/**
 * Define a hook for one field synced across devices via Firestore global_data.
 * The hook behaves like useState:
 *
 *   export const useJournalEntries = defineSyncedField("journal", "entries", { initial: [] });
 *   const [entries, setEntries] = useJournalEntries();
 *
 * Declare each field once (see data/syncedData.js) so every component shares
 * the same options and the same value. Guarantees: services/syncedField.js.
 */
export function defineSyncedField(docName, field, options) {
  return function useSyncedField() {
    const controller = getSyncedField(docName, field, options);
    const value = useSyncExternalStore(controller.subscribe, controller.get, controller.get);
    return [value, controller.set];
  };
}
