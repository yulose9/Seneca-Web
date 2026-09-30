# A — Route transitions, tab bar, global CSS

- **Status**: DONE · **Commit**: a046bd3 · **Severity**: HIGH
- **Categories**: Performance, Purpose & frequency, Interruptibility, Cohesion
- **Files (only these)**: `src/AnimatedRoutes.jsx`, `src/components/PageTransition.jsx`, `src/components/GlassTabBar.jsx`, `src/components/LiquidGlass.jsx`, `src/index.css`, `src/App.jsx`, `src/components/LoginScreen.jsx`, `src/components/Sheet.jsx`
- Read `plans/animations/README.md` first (tokens + rules).

## A1 — Tab switches have dead time and animate on the main thread (HIGH)

Current (`src/AnimatedRoutes.jsx:14`, `src/components/PageTransition.jsx:8-10`):
```jsx
<AnimatePresence mode="wait">
const pageVariants = {
    initial: { opacity: 0, scale: 0.99 },
    in: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: EASE_OUT } },
    out: { opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }
};
```
Every tab switch (tens/day) waits 120ms for the old page to fade before the new (heavy) page even mounts, then runs a main-thread `scale` shorthand during the most expensive moment.

Target:
- `AnimatePresence mode="wait" initial={false}` stays, but the exit is instant: `out: { opacity: 1, transition: { duration: 0 } }` → zero dead time; first app load doesn't fade.
- Enter is opacity only: `initial: { opacity: 0 }`, `in: { opacity: 1, transition: { duration: 0.15, ease: EASE_OUT } }`. No scale.
- Update the file comment to say why.

## A2 — Tab bar: endless repaint, dead code, over-budget spring, heavy blur (HIGH)

1. `src/index.css:345-368` — `.liquid-active-tab::after { … animation: liquidShimmer 3.5s ease-in-out infinite; }` + `@keyframes liquidShimmer` animates `background-position` forever on a backdrop-filter layer → repaints every frame on every screen (battery). **Delete the `::after` shimmer rule and the keyframes** (and its reduced-motion override near the end of the file).
2. `src/components/GlassTabBar.jsx:27,55-69` — `const pillControls = useAnimation();` + `await pillControls.start({ scaleX: [1, stretch, 1] … })` — `pillControls` is never attached to an element, so this does nothing. **Delete the dead stretch effect, `useAnimation` import and related vars.**
3. `GlassTabBar.jsx:10` `PILL_SPRING = { type: "spring", duration: 0.4, bounce: 0 }` drives the pill and icon lift on every tab switch (over the 300ms budget). **Change to `{ type: "spring", duration: 0.3, bounce: 0 }`.**
4. The pill animates `animate={{ x: currentX }}` (~line 84). **Switch to a transform string** `animate={{ transform: \`translateX(${currentX}px)\` }}` (and matching `initial`) so it's compositor-driven. If the pill also relies on `x` elsewhere (e.g. `-50%` centering), keep equivalent positioning.
5. `index.css:164` `--liquid-pill-blur: 24px` → `20px` (blur moved per frame must stay ≤ 20px).
6. Tab bar entrance `GlassTabBar.jsx:78` `{ type: "spring", duration: 0.5, bounce: 0, delay: 0.2 }` → `{ type: "spring", duration: 0.4, bounce: 0, delay: 0.1 }` (runs once per app load).

## A3 — CSS transitions fight framer on the same `transform` (HIGH)

Framer writes inline transforms every frame (whileTap, layout); a CSS `transition: transform` on the same element re-eases each write → presses feel laggy/doubled. Remove **only the `transform` part** of these transitions (keep color/background/opacity parts) and delete the `:active { transform: scale(...) }` rules on framer-driven elements:
- `.liquid-nav` (`index.css:~225`: `transform 0.3s var(--ease-out)`)
- `.liquid-nav-item` (`~276-278`: `transform 0.16s var(--ease-out)`)
- `.ios-checkbox` (`~452-455`) and `.ios-checkbox:active` (`~479`)
- `.ios-checkbox-icon` (`~492`: `transform 0.3s cubic-bezier(0.2, 0, 0, 1)`) — the icon is framer-driven; drop its transform transition.
- `.protocol-pill` (`~1400-1403`) and `.protocol-pill:active` (`~1420`)
Then fix the `@media (prefers-reduced-motion: reduce)` block near the end: delete rules for classes that no longer exist (`.ios-card`, `.ios-button`) and the `transform: none` overrides you just made redundant; keep the part that disables smooth scroll and keeps opacity/color.

## A4 — Dead motion CSS + token cohesion (LOW)

- Delete unused `--spring-bounce` and `--spring-smooth` vars (`index.css:~114-116`); if `--ease-out-expo` has exactly one use (e.g. `index.css:~517 stroke-dashoffset 0.6s var(--ease-out-expo)`), change that use to `stroke-dashoffset 0.3s var(--ease-out)` and delete the var.
- Delete `@keyframes fadeIn`, `slideUp`, `scaleIn` (`~581-615`) after grepping `src/` to confirm no references.
- In your JSX files: `{ duration: 0.2, ease: EASE_OUT }` → `FADE`; quick exits `{ duration: 0.1–0.15, ease: EASE_OUT }` → `FADE_EXIT` (e.g. `App.jsx:~99`, `LoginScreen.jsx:~63`); bare `{ duration: x }` → add `ease: EASE_OUT`.

## Verification
- `npx vite build` ✓, `npx eslint <files>` no new errors, `npm run test:sync` ✓.
- Feel: switching tabs rapidly shows the new page immediately with a short fade — no blank frame between pages; the tab pill glides (no stretch, no shimmer) and settles in ~0.3s; pressing the task checkbox/tab items scales once, crisply (no double ease). DevTools Rendering → paint flashing: the tab bar does not repaint while idle.
- Done when: no `liquidShimmer`, no `useAnimation` in GlassTabBar, no `transition: … transform` on the listed classes, route exit duration 0.
