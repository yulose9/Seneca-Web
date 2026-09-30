# B — Protocol, carousel, Home

- **Status**: DONE · **Commit**: a046bd3 · **Severity**: HIGH
- **Categories**: Purpose & frequency, Accessibility, Interruptibility, Performance, Physicality, Missed opportunities
- **Files (only these)**: `src/pages/Protocol.jsx`, `src/components/ProtocolCarousel.jsx`, `src/pages/Home.jsx`, `src/components/DailyTasksReminder.jsx`, `src/components/AddTaskSheet.jsx`, `src/components/SystemCard.jsx`
- Read `plans/animations/README.md` first (tokens + rules). Line numbers are approximate — find the quoted code.

## B1 — Confetti replays on every visit and ignores reduced motion (HIGH)
`src/pages/Protocol.jsx:~521`:
```jsx
useEffect(() => {
  if (allPhasesComplete && hasTasks) {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: [...] });
  }
}, [allPhasesComplete, hasTasks]);
```
Fires on the *state* (every mount of the tab, every reload, switching back to a finished category) instead of the *moment* of completion; canvas confetti bypasses MotionConfig.
Target: keep a `prevAllCompleteRef` (initialised to the current value on mount so mounting never fires); fire only when it goes false→true; also guard with `localStorage` key `seneca_celebrated_${getPhDateKey()}_${protocolCategory}` (import `getPhDateKey` from `../utils/timeUtils`) so it fires at most once per day per category; pass `disableForReducedMotion: true` to `confetti(...)`.

## B2 — Presses inherit slow transitions (HIGH)
Every `whileTap` → `TAP` (buttons/icons) or `TAP_CARD` (cards/big rows). These carry their own transition. Replace literals like `whileTap={{ scale: 0.98 }}` (`Protocol.jsx:~415`) and check `Protocol.jsx:~562` (inherits ICON_SPRING). Remove now-redundant `transition={TAP_TRANSITION}` props only where the element has no other animated props.

## B3 — Protocol swaps with blank gaps (MED)
- Phase expand/collapse `Protocol.jsx:~376` `<AnimatePresence mode="wait" initial={false}>` with `exit={{ opacity: 0, height: 0 }}` + LAYOUT_SPRING: collapse runs fully before the summary appears. Target: remove `mode="wait"`; animate the container height once (a parent `motion.div layout` with `transition={LAYOUT_SPRING}`, or AnimatePresence `mode="popLayout"` if the children can take refs); children crossfade with opacity only (enter `FADE`, exit `FADE_EXIT`). No sequential collapse-then-appear.
- Category switch `Protocol.jsx:~602` `mode="wait"` + `exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }}` + LAYOUT_SPRING on `x`. Target: no `mode="wait"`, no `x`; enter `initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={FADE}`, exit instant (`exit={{ opacity: 0, transition: { duration: 0 } }}`).
- Category pill label `Protocol.jsx:~272`: `initial={{ maxWidth: 0, opacity: 0, marginLeft: 0 }} animate={{ maxWidth: 120, opacity: 1, marginLeft: 4 }}` animates layout properties. Target: render the label with fixed `ml-1`, animate only `opacity` (enter `FADE`, exit `FADE_EXIT`); the pill's existing `layout` prop handles the width change.
- Bare opacity durations (`~277` `opacity: { duration: 0.15, delay: 0.05 }`, `~383` `opacity: { duration: 0.2 }`) → add `ease: EASE_OUT`.

## B4 — Carousel & progress bars (MED)
- `ProtocolCarousel.jsx:~244` `<LiquidGlass as={motion.div} layout transition={LAYOUT_SPRING} …>` resizes an SVG-filtered backdrop every frame when paging. Remove `layout` and `transition` there. In `Home.jsx` (~270, ~275, ~416) remove `layout`/`transition={LAYOUT_SPRING}` from wrapper `motion.div`s that exist only to animate layout — but keep Edit-mode reordering (`Reorder.Group/Item`) working; if a wrapper is needed for Reorder, leave it.
- Carousel release slide `ProtocolCarousel.jsx:~308` `transition={{ duration: 0.3, ease: EASE_DRAWER }}` on the dragged `x`: replace with `{ type: "spring", duration: 0.35, bounce: 0 }` so flick velocity carries into the slide (keep `x` on the draggable element — framer drag needs it).
- Progress fills `ProtocolCarousel.jsx:~350` and `DailyTasksReminder.jsx:~213`: `initial={{ width: 0 }} animate={{ width: \`${p}%\` }}` → `initial={false} animate={{ scaleX: p / 100 }} transition={PROGRESS_TRANSITION}` with `style={{ transformOrigin: "left" }}` and the element at full width (`w-full`). No replay from 0 on mount.
- Feedback emoji `ProtocolCarousel.jsx:~583` `initial={{ opacity: 0, scale: 0.5, … }}` + spring bounce 0.2 → `scale: 0.9`, bounce 0.

## B5 — Missing press feedback (MED)
- `TaskRow` `Protocol.jsx:~187` (`<div onClick … className="… cursor-pointer bg-surface transition-colors">`) → add `active:bg-fill` (iOS row highlight, instant press-in).
- Carousel card and header rows (`ProtocolCarousel.jsx:~321, ~362, ~436, ~502`) → card: `whileTap={TAP_CARD}` (make it `motion.div` if needed); rows: `active:bg-fill`.
- Home journal card (`Home.jsx:~337`, `<div onClick … className="relative overflow-hidden rounded-2xl p-5 cursor-pointer bg-surface shadow-card">`) → `motion.div` with `whileTap={TAP_CARD}`.
- Phase header (`Protocol.jsx:~332`, `role="button"`) → `active:opacity-60`.

## B6 — Teleporting state changes (LOW, missed opportunity)
- Phase unlock (`Protocol.jsx:~347-374`): the "Locked" pill vanishes and `opacity-50 grayscale` snaps off. Target: wrap the pill in `AnimatePresence initial={false}` with exit `{ opacity: 0, scale: 0.9, transition: FADE_EXIT }`; give the locked container `transition-[opacity,filter] duration-300 ease-out` so unlocking fades in.
- Empty state → first task (`Protocol.jsx:~613-635`): crossfade by keying on `hasTasks` inside `AnimatePresence initial={false}` (opacity, `FADE` / exit instant).

## B7 — Tokens in these files (LOW)
`{ duration: 0.2, ease: EASE_OUT }` → `FADE`; quick exits (0.1–0.15, EASE_OUT) → `FADE_EXIT`; bare durations → add `ease: EASE_OUT`.

## Verification
- `npx vite build` ✓, `npx eslint <files>` no new errors, `npm run test:sync` ✓.
- Feel: finish all tasks → confetti once; leave and reopen Protocol → no confetti; reload → none. Switching categories shows the new list immediately (no blank gap). Expanding/collapsing a phase is one smooth height change. Tapping a task row highlights instantly. Paging the carousel with a quick flick carries momentum. Progress bars don't restart from 0 when revisiting Home.
