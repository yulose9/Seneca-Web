/**
 * Synced field — one top-level field of users/{uid}/global_data/{docName},
 * mirrored into local state, localStorage and Firestore.
 *
 * Interface:
 *   const field = getSyncedField(docName, field, { initial, storageKey?, mergeDirty? })
 *   field.get()            → current value
 *   field.set(valueOrFn)   → local change: state + localStorage + queued cloud write
 *   field.subscribe(fn)    → fn() on every change (local or remote); returns unsubscribe
 *
 * Guarantees (callers don't need to know how):
 * - Only LOCAL changes are written, and only this field. Applying a cloud
 *   update never triggers a write, so a device can't re-upload stale state
 *   over another device's edit.
 * - Remote updates replace the local value (deletions from other devices
 *   stick) — except while this device still has unsent writes for the doc;
 *   the engine re-delivers the settled state once they land.
 * - Edits that never reached the server in a previous session (app closed
 *   offline) are merged with the cloud value via `mergeDirty(local, cloud)`
 *   (default: local wins) and re-sent, once, on the first authoritative snapshot.
 * - One instance per (docName, field): every component sees the same value.
 *   Options are read on first creation only.
 * - Writes are coalesced, diffed and held until hydration by dataLogger.
 */
import {
  hasPendingGlobalWrite,
  isGlobalDirty,
  subscribeToGlobalData,
  updateGlobalData,
} from "./dataLogger";
import { isEqual } from "../utils/stableEqual";

const registry = new Map(); // "doc/field" → controller
// Whether each doc had unsynced edits when this session first touched it.
// Captured once per doc: the first field's re-push would otherwise clear the
// flag before sibling fields get to merge their own leftovers.
const dirtyAtStart = new Map();

const readLocal = (storageKey, fallback) => {
  if (!storageKey) return fallback;
  try {
    const raw = localStorage.getItem(storageKey);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeLocal = (storageKey, value) => {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    /* quota exceeded — cloud copy is still authoritative */
  }
};

const createSyncedField = (docName, field, { initial, storageKey, mergeDirty }) => {
  if (!dirtyAtStart.has(docName)) dirtyAtStart.set(docName, isGlobalDirty(docName));

  let value = readLocal(storageKey, typeof initial === "function" ? initial() : initial);
  let leftoverHandled = false;
  let unsubscribeCloud = null;
  const listeners = new Set();

  const emit = () => listeners.forEach((fn) => fn());

  const apply = (next) => {
    value = next;
    writeLocal(storageKey, next);
    emit();
  };

  const onCloud = (data, meta) => {
    if (!(field in data)) return;
    const cloud = data[field];

    if (!leftoverHandled && meta.authoritative) {
      leftoverHandled = true;
      if (dirtyAtStart.get(docName)) {
        const merged = mergeDirty ? mergeDirty(value, cloud) : value;
        if (!isEqual(merged, value)) apply(merged);
        updateGlobalData(docName, { [field]: merged });
        return;
      }
    }

    // Our own unsent edits win; the engine replays the settled state after.
    if (hasPendingGlobalWrite(docName)) return;
    if (!isEqual(cloud, value)) apply(cloud);
  };

  return {
    get: () => value,
    set: (valueOrFn) => {
      const next = typeof valueOrFn === "function" ? valueOrFn(value) : valueOrFn;
      if (next === value) return;
      apply(next);
      updateGlobalData(docName, { [field]: next });
    },
    subscribe: (fn) => {
      listeners.add(fn);
      if (!unsubscribeCloud) unsubscribeCloud = subscribeToGlobalData(docName, onCloud);
      return () => {
        listeners.delete(fn);
        if (listeners.size === 0 && unsubscribeCloud) {
          unsubscribeCloud();
          unsubscribeCloud = null;
        }
      };
    },
  };
};

export const getSyncedField = (docName, field, options = {}) => {
  const key = `${docName}/${field}`;
  let controller = registry.get(key);
  if (!controller) {
    controller = createSyncedField(docName, field, options);
    registry.set(key, controller);
  }
  return controller;
};
