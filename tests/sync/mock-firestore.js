// Minimal Firestore mock: doc refs, onSnapshot (server-first), setDoc with mergeFields.
export const server = new Map();
export const stats = {
  listens: 0,
  writes: 0,
  log: [],
  writesTo: (suffix) => stats.log.filter((p) => p.endsWith(suffix)).length,
};
export let lastWrite = null;
const listeners = new Map(); // path -> Set<fn>
const queued = [];
export const control = {
  delayServer: false,
  release() {
    queued.splice(0).forEach((f) => f());
  },
};

export const doc = (_db, ...segments) => ({ path: segments.join("/") });
export class FieldPath {
  constructor(...segments) { this.segments = segments; }
}
const fieldName = (f) => (typeof f === "string" ? f : f.segments.join("."));

const snap = (path, pending = false) => ({
  exists: () => server.has(path),
  data: () => structuredClone(server.get(path)),
  metadata: { fromCache: false, hasPendingWrites: pending },
});

// Paths that already exist in the local IndexedDB cache on this "device"
export const cached = new Set();

export const onSnapshot = (ref, optsOrNext, maybeNext) => {
  const opts = typeof optsOrNext === "function" ? {} : optsOrNext;
  const next = typeof optsOrNext === "function" ? optsOrNext : maybeNext;
  stats.listens++;
  if (!listeners.has(ref.path)) listeners.set(ref.path, new Set());
  listeners.get(ref.path).add(next);
  if (cached.has(ref.path) && server.has(ref.path)) {
    // Real SDK: cached doc is served first (fromCache: true). When the server
    // confirms identical data, only a metadata event follows — delivered ONLY
    // with includeMetadataChanges.
    setTimeout(() => next({ ...snap(ref.path), metadata: { fromCache: true, hasPendingWrites: false } }), 2);
    if (opts.includeMetadataChanges) setTimeout(() => next(snap(ref.path)), 20);
    return () => listeners.get(ref.path).delete(next);
  }
  const deliver = () => next(snap(ref.path));
  if (control.delayServer) queued.push(deliver);
  else setTimeout(deliver, 5);
  return () => listeners.get(ref.path).delete(next);
};

const setPath = (obj, parts, value) => {
  let node = obj;
  parts.slice(0, -1).forEach((p) => {
    if (typeof node[p] !== "object" || node[p] === null) node[p] = {};
    node = node[p];
  });
  node[parts.at(-1)] = value;
};
const getPath = (obj, parts) => parts.reduce((a, k) => (a == null ? undefined : a[k]), obj);

export const setDoc = async (ref, data, opts) => {
  stats.writes++;
  stats.log.push(ref.path);
  lastWrite = { path: ref.path, data: structuredClone(data), opts: opts && { ...opts, mergeFields: opts.mergeFields?.map(fieldName) } };
  const current = structuredClone(server.get(ref.path) || {});
  (opts?.mergeFields || []).forEach((f) => {
    const parts = typeof f === "string" ? f.split(".") : f.segments;
    setPath(current, parts, structuredClone(getPath(data, parts)));
  });
  server.set(ref.path, current);
  (listeners.get(ref.path) || new Set()).forEach((fn) => fn(snap(ref.path, true)));
};

// Simulate a remote change arriving from another device
export const emit = (path) => (listeners.get(path) || new Set()).forEach((fn) => fn(snap(path)));
