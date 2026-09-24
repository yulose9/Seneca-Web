# Sync tests

`npm run test:sync` exercises the sync modules through their interfaces with an
in-memory Firestore stand-in (`mock-firestore.js`), including the real SDK's
cache-then-metadata-only confirmation behaviour.

- `engine.test.mjs` — `services/dataLogger.js`: shared listeners, held writes
  until hydration, diffing, `mergeFields`/`FieldPath`, replay, returning devices.
- `syncedField.test.mjs` — `services/syncedField.js`: local-only writes,
  remote replacement, leftover-dirty merge.
- `pure.test.mjs` — `utils/timeUtils.js` and `utils/streaks.js`.
