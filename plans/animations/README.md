# Animation & flow plans

Written by the `improve-animations` audit (Emil Kowalski's motion rules) at commit `a046bd3`.
Four executor plans, one per app area; each owns a disjoint set of files so they can run in parallel.

| Plan | Area | Severity | Status |
| --- | --- | --- | --- |
| [A](A-shell-tabbar-css.md) | Route transitions, tab bar, global CSS | HIGH | DONE |
| [B](B-protocol-home.md) | Protocol, carousel, Home | HIGH | DONE |
| [C](C-wealth-journal-swipe.md) | Wealth, keypad, Journal, shared SwipeRow | HIGH | DONE |
| [D](D-growth-editor-popovers.md) | Growth heatmaps, editor menus, popovers | HIGH | DONE |

Order: any (disjoint files). After all four: delete `src/components/GsapText.jsx` / `GsapStagger.jsx` if unused and drop `gsap` + `@gsap/react` from package.json.

## Conventions every plan follows (read before editing)

Motion tokens live in `src/constants/motion.js` — import from there, never hand-type values:

| Token | Value | Use |
| --- | --- | --- |
| `EASE_OUT` | `[0.23, 1, 0.32, 1]` | enters/exits, UI response |
| `EASE_IN_OUT` | `[0.77, 0, 0.175, 1]` | on-screen movement |
| `EASE_DRAWER` | `[0.32, 0.72, 0, 1]` | sheet exits |
| `FADE` | `{ duration: 0.2, ease: EASE_OUT }` | fades in |
| `FADE_EXIT` | `{ duration: 0.15, ease: EASE_OUT }` | fades out (exits are quicker than enters) |
| `LAYOUT_SPRING` | `{ type: "spring", duration: 0.35, bounce: 0 }` | layout / height changes |
| `DIALOG_SPRING` | `{ type: "spring", duration: 0.3, bounce: 0 }` | centered dialogs |
| `SHEET_SPRING` / `SHEET_EXIT` | spring 0.45 bounce 0 / 0.25 EASE_DRAWER | bottom sheets (Sheet.jsx) |
| `ICON_ENTER` / `ICON_VISIBLE` / `ICON_SPRING` | scale .25 + blur 4px → 1 / spring .3 | icon swaps |
| `TAP` | `{ scale: 0.96, transition: TAP_TRANSITION }` | press on buttons/icons |
| `TAP_CARD` | `{ scale: 0.98, transition: TAP_TRANSITION }` | press on cards / big rows |
| `PROGRESS_TRANSITION` | `{ duration: 0.3, ease: EASE_OUT }` | progress fills (scaleX) |

`TAP`/`TAP_CARD` carry their own transition, so `whileTap={TAP}` never inherits a component's delayed or slow transition. Use them for every `whileTap`; delete literal `whileTap={{ scale: … }}`.

CSS easing vars in `src/index.css :root`: `--ease-out`, `--ease-in-out`, `--ease-drawer`.
Reduced motion: `<MotionConfig reducedMotion="user">` (App.jsx) covers framer transforms only; imperative `animate()`, canvas confetti and `scrollTo({behavior:"smooth"})` must check `useReducedMotion()` themselves.

Rules (AUDIT.md): UI motion ≤ 300ms; never `ease-in`; never `scale(0)` (≥ 0.9 + opacity); animate transform/opacity only (no width/height/margin/max-width); popovers scale from their trigger (modals stay centered); keyboard-driven UI doesn't animate; one owner per `transform` (no CSS `transition: transform` on elements framer animates).

Global boundaries: no new dependencies, no markup restructuring beyond what a plan says, don't touch files outside the plan's list, no commits/deploys. If code doesn't match the plan (drift), stop and report.

Verification for every plan: `npx vite build` passes; `npx eslint <your files>` introduces no new errors; `npm run test:sync` passes. Feel check notes are in each plan.
