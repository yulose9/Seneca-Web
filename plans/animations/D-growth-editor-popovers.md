# D — Growth heatmaps, editor menus, popovers

- **Status**: DONE · **Commit**: a046bd3 · **Severity**: HIGH
- **Categories**: Purpose & frequency, Physicality & origin, Easing, Accessibility, Cohesion
- **Files (only these)**: `src/pages/Growth.jsx`, `src/components/GsapStagger.jsx`, `src/components/HabitDetailSheet.jsx`, `src/components/WeightInputDialog.jsx`, `src/components/CertificationDetailSheet.jsx`, `src/components/AddCertificationSheet.jsx`, `src/components/AddGoalSheet.jsx`, `src/components/CalendarViewSheet.jsx`, `src/components/WeatherWidget.jsx`, `src/components/RichTextEditor.jsx`, `src/components/JournalDetailSheet.jsx`, `src/components/editor/*`
- Read `plans/animations/README.md` first (tokens + rules). Line numbers approximate — find the quoted code.

## D1 — Heatmap presses wait for the entrance stagger (HIGH)
`src/pages/Growth.jsx:~504-524`:
```jsx
whileTap={TAP}
initial={{ scale: 0.9, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
transition={{
  opacity: { delay: index * 0.012, duration: 0.2, ease: EASE_OUT },
  scale: { delay: index * 0.012, type: "spring", duration: 0.3, bounce: 0 },
}}
```
The release after a press animates back via `transition.scale` (with the per-cell delay), so later cells feel up to ~240ms late on a tens-per-day tap.
Target: entrance is opacity-only — `initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ opacity: { delay: Math.min(index * 0.008, 0.16), duration: 0.2, ease: EASE_OUT } }}`; no scale entrance; `whileTap={TAP}` (carries its own transition). Apply the same to HabitDetailSheet's day cells and any other `whileTap` in your files (TAP buttons/icons, TAP_CARD cards/rows; delete literal scales).

## D2 — Growth content replays a GSAP entrance on every tab visit (HIGH)
`Growth.jsx:~923` `<GsapStagger className="px-5" delay={0.2}>` runs `gsap.fromTo(… { y: 12, opacity: 0 }, { duration: 0.4, stagger: 0.05 })` on every mount; habit content is invisible ~0.3s and settles ~0.8s after each tab switch.
Target: replace `<GsapStagger className="px-5" delay={0.2}>…</GsapStagger>` with `<div className="px-5">…</div>`. Remove the unused `GsapText` import from Growth.jsx. If `GsapStagger` has no other usages in `src/`, delete `src/components/GsapStagger.jsx`. (Do not touch Home.jsx or package.json — report back.)

## D3 — Growth progress bar + orphan layoutId (MED)
- `Growth.jsx:~673-675` progress fill animates `width` from 0 (0.5s) on every visit → `initial={false} animate={{ scaleX: p / 100 }} transition={PROGRESS_TRANSITION}` with `style={{ transformOrigin: "left" }}` on a full-width element.
- `Growth.jsx:~858` `layoutId="growth-hero-card"` has no partner anywhere → remove the prop.

## D4 — Editor menus (keyboard-driven) and dropdown origin (MED/LOW)
- Slash menu `editor/CommandsList.jsx:~164-166` `initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.1, ease: EASE_OUT }}` — opened by typing "/", navigated by arrow keys: render statically (plain element, no fade). If the selected-item background transition lives in JSX, remove it; if it's the CSS `.slash-command-item { transition: background-color 0.15s ease; }` in index.css, leave it and report the selector (another plan owns index.css).
- Bubble menu dropdowns `editor/EditorBubbleMenu.jsx:~180-184` and `~284-288`: `initial={{ opacity: 0, y: -8, scale: 0.95 }} … transition={{ duration: 0.15 }}` (no ease → framer's easeInOut; scales from center) while `DROPDOWN_MOTION` (line ~27: scale .97, EASE_OUT, `transformOrigin: "top left"`) is defined but unused. Target: spread `DROPDOWN_MOTION` on both; exit uses `FADE_EXIT`.
- Pickers that pop in/out with no motion: emoji picker `JournalDetailSheet.jsx:~579`, highlight picker `RichTextEditor.jsx:~344` → wrap in `AnimatePresence`, `initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97, transition: FADE_EXIT }} transition={FADE}` with `transformOrigin` set to the side of the trigger (e.g. `"top left"` / `"top right"` per layout).

## D5 — Press feedback + reduced motion + tokens (LOW)
- WeatherWidget forecast rows (`~164`, `~178`, `role="button"`, hover-only) → `active:bg-fill`.
- `WeightInputDialog.jsx:~40-42` `scrollTo({ top, behavior: "smooth" })` → `behavior: reduceMotion ? "auto" : "smooth"` using framer's `useReducedMotion()`.
- Tokens in your files: `{ duration: 0.2, ease: EASE_OUT }` → `FADE`; quick exits → `FADE_EXIT`; bare durations (e.g. `WeatherWidget.jsx:~204` `opacity: { duration: 0.2 }`, EditorBubbleMenu) → add `ease: EASE_OUT`.

## Verification
- `npx vite build` ✓, `npx eslint <files>` no new errors, `npm run test:sync` ✓.
- Feel: tapping the last heatmap cell presses and releases as fast as the first; opening Growth shows habit cards immediately (no stagger wait); typing "/" in the editor shows the menu instantly and arrow keys move the highlight with no fade; bubble-menu dropdowns grow from their trigger's top-left corner.
