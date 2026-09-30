# C — Wealth, keypad, Journal, shared SwipeRow

- **Status**: DONE · **Commit**: a046bd3 · **Severity**: HIGH
- **Categories**: Purpose & frequency, Interruptibility, Performance, Accessibility, Missed opportunities
- **Files (only these)**: `src/pages/Wealth.jsx`, `src/pages/Journal.jsx`, `src/components/AddTransactionSheet.jsx`, `src/components/AccountDetailSheet.jsx`, `src/components/TransactionDetailSheet.jsx`, `src/components/ObligationReminder.jsx`, NEW `src/components/SwipeRow.jsx`
- Read `plans/animations/README.md` first (tokens + rules). Line numbers approximate — find the quoted code.

## C1 — Keypad amount animates on every key press (HIGH)
`src/components/AddTransactionSheet.jsx:~62-90` `RollingNumber` runs `animate(motionValue, value, { duration: 0.15, … onUpdate: … Math.round(latest).toLocaleString() })` for typed input: typing 5 then 0 counts 6,7…50 and drops decimals mid-tween.
Target: typed input renders directly — replace the `RollingNumber` usage (~578) with a plain element showing `${prefix}${displayValue}` (keep classes, `tabular-nums`); delete `RollingNumber` from this file if unused.

## C2 — Hold-to-clear has no visible cue on iPhone (MED)
`AddTransactionSheet.jsx:~128-153`: holding ⌫ clears after a 500ms `setTimeout`; the only cue is `navigator.vibrate(50)` (unsupported on iOS Safari).
Target (AUDIT §4 asymmetric timing): inside the ⌫ key add an absolutely-positioned overlay `bg-negative/20 rounded-[inherit] pointer-events-none`; while held its `clip-path` goes `inset(0 100% 0 0)` → `inset(0 0 0 0)` with `transition: clip-path 500ms linear`; on release it snaps back with `transition: clip-path 200ms var(--ease-out)`. Drive it with a `holding` state toggled by the existing pointer handlers. Keep tap = delete one digit, keep `navigator.vibrate` as progressive enhancement.

## C3 — Swipe-to-delete doesn't follow the finger (MED) → one deep module
Three copies of the same logic: `Journal.jsx:~192-201`, `Wealth.jsx:~210-214` (SwipeableRow), `Wealth.jsx:~420-424` (TransactionItem):
```js
const diff = e.touches[0].clientX - parseFloat(e.currentTarget.dataset.startX);
if (diff < -50) setShowDelete(true);
if (diff > 50) setShowDelete(false);
```
No finger tracking, no velocity, no direction lock (a sideways-drifting scroll opens delete), no multi-touch guard.
Target: new `src/components/SwipeRow.jsx`, interface:
```jsx
<SwipeRow onDelete={fn} deleteLabel="Delete" disabled={isSelecting} onLongPress={fn?} className="…">{children}</SwipeRow>
```
Behaviour: the content is a `motion.div` with `drag="x"`, `dragDirectionLock`, `dragConstraints={{ left: -80, right: 0 }}`, `dragElastic={0.1}` (rising friction past the edge), follows the finger. On drag end: open (`x: -80`) if `info.offset.x < -40 || info.velocity.x < -300`, else closed (`x: 0`), animated with `{ type: "spring", duration: 0.35, bounce: 0 }`. The red delete button sits underneath on the right, fully hidden when closed (it must not peek). Tapping the row while open closes it instead of opening the item. `disabled` → no drag. Long press (≈500ms without moving > 8px) calls `onLongPress` (used today to enter select mode); a horizontal drag cancels the long press. Replace all three sites with `SwipeRow` and delete their touch handlers/`showDelete` state. Deletion test: removing SwipeRow must make this logic reappear in 3 places.

## C4 — Search results re-animate on every keystroke (MED)
`Wealth.jsx:~1523-1532` `<motion.div layout className="space-y-2"><AnimatePresence mode="popLayout" …>` with rows `layout initial={{ opacity: 0, y: 4 }}` — the unbounded list re-measures/animates per key. Target: static rows (plain `div`, no `layout`, no per-row initial/exit, no `popLayout`); at most one container-level `FADE` when the results area first appears.

## C5 — Rolling numbers, stagger, smooth scroll, reduced motion (LOW)
- `AccountDetailSheet.jsx:~53-59` counts the balance up from 0 on every open (`useMotionValue(0)` + `duration: 0.6`); `Wealth.jsx:~92-99` RollingNumber `duration: 0.6`. Target: start at the current value (no count-up on mount), animate only when the value changes, `duration: 0.3, ease: EASE_OUT`; if `useReducedMotion()` (framer) is true, set the text instantly.
- `AccountDetailSheet.jsx:~89` stagger `delay: 0.1 + Math.min(i, 8) * 0.04` → `delay: Math.min(i, 6) * 0.03` (total ≤ ~0.2s), `duration: 0.2`.
- `AccountDetailSheet.jsx:~144` `el.scrollIntoView({ behavior: "smooth", block: "center" })` → `behavior: reduceMotion ? "auto" : "smooth"` (explicit smooth overrides the CSS reduced-motion rule).
- Tokens: `{ duration: 0.2, ease: EASE_OUT }` → `FADE`; quick exits → `FADE_EXIT`; bare durations → add `ease: EASE_OUT`.

## C6 — Journal entrance + presses (HIGH/LOW)
- `Journal.jsx:~635-637` editor section `initial={{ opacity: 0, y: 12 }} … transition={{ delay: 0.2, duration: 0.35, ease: EASE_OUT }}` replays on every tab visit and delays the main content ~0.55s. Target: no entrance animation (render immediately; the route fade covers it). Same for any other `delay:` entrance on the Journal page header/list.
- Every `whileTap` in your files → `TAP` / `TAP_CARD` (they carry their own transition), e.g. success-overlay button (`Journal.jsx:~93`, currently waits for its 0.25s entrance delay) and Save (`~708`).

## C7 — Missing press feedback (MED)
Bulk-select text buttons (`Journal.jsx:~603, ~615`; `Wealth.jsx:~1261, ~1273, ~1443`) → `active:opacity-60`; Wealth filter pills (`~1172`) → `motion.button whileTap={TAP}`.

## C8 — Transactions teleport on add/delete (LOW, missed opportunity)
`Wealth.jsx:~1454-1473` grouped transaction rows are plain divs. Target: wrap each group's rows in `AnimatePresence initial={false}`; row wrapper `motion.div` with `initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0, transition: FADE_EXIT }} transition={FADE}` and `overflow-hidden`, so a saved or deleted transaction fades and the rows below close up (height on exit only).

## Verification
- `npx vite build` ✓, `npx eslint <files>` no new errors, `npm run test:sync` ✓.
- Feel: typing 1-2-3-.-5 on the keypad shows exactly those digits instantly; holding ⌫ fills red over ½s then clears, releasing early snaps the fill back fast. Swiping a row tracks the finger, a quick flick opens it, a vertical scroll never opens it, tapping an open row closes it; no red sliver when closed. Typing in Wealth search updates results without motion. Opening an account shows the balance immediately (no count-up). Journal tab shows the editor immediately.
