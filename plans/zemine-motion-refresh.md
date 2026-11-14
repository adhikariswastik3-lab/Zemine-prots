# Zemine: faster, modern motion pass

## Problem
The app feels slow and dated. Audit findings:
- **No screen transitions.** Routes swap instantly (`App.tsx` just renders the matched element), so navigation feels abrupt and then, with lazy chunks, flashes a loader.
- **Almost no interaction feedback.** Only `.btn.primary:active` and `.pay-cta:active` have a press state. There are no hover, focus or press transitions on chips, rows, nav items, keypad keys, toggles or cards.
- **Overlays have no exit.** Sheets and dialogs animate in (`sheet-up`) but vanish instantly when closed. The overlay backdrop does not fade.
- **Slow mock latency makes the app feel sluggish.** `wait()` calls run 400 to 1500 ms (face match 1500, framing 1400, enrollment 1500, authorize 1100, top-up 900). Checkout capture adds a fixed 2200 ms and a 900 ms "steady" delay, so a sale takes about 6 seconds before the result.
- **Content pops in.** Lists, stats and balances render fully formed. Numbers never count. The carousel and toasts are the only things that move well.
- **Easing is generic.** Most animations use `ease-out` or default easing and long durations (0.5 to 0.7 s).

## Direction
"Snappy retro arcade": fast, springy, tactile. Keep the hard-edged, bordered, pixel identity, but make motion quick (120 to 280 ms), physical (hard-shadow press, springy overshoot on key moments) and purposeful. Nothing decorative loops forever except the scan line and loader.

## Motion system (tokens in `src/styles/tokens.css`)
- Durations: `--dur-fast: 120ms`, `--dur-base: 200ms`, `--dur-slow: 320ms`.
- Easings: `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`, `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`.
- Animate only `transform` and `opacity` (plus `box-shadow` for the hard-shadow press). No layout-property animation.
- All motion respects `prefers-reduced-motion` and the existing in-app Motion toggle (`html[data-motion="off"]`), which already zeroes durations globally.

## Changes

### 1. Screen transitions
- Use the View Transitions API inside `navigate()` (`document.startViewTransition` when available and motion is on). Define `::view-transition-old/new(root)` as a 180 ms fade plus 12 px vertical slide.
- Direction awareness: tab-level moves (bottom nav) use a short cross-fade; drilling in (Wallet to enrollment, checkout steps) slides from the right; back slides from the left. Track direction via a `data-nav="forward|back|tab"` attribute set before the transition.
- Fallback for browsers without the API: a CSS `screen-enter` animation (opacity and 10 px translate, 220 ms) applied to `.screen` keyed on the path.
- Replace the full-screen `Loader` Suspense fallback with a delayed one (show only after 150 ms) so fast lazy loads never flash. Prefetch role chunks on idle after sign-in (`import()` calls) so navigation is instant.

### 2. Staggered content entrance
- Add a small `.reveal` utility (`opacity` and `translateY(10px)` to rest, 260 ms, `--ease-out`) with `--i` index for 40 ms stagger, capped at 8 items.
- Apply to home stat cards, section blocks, transaction rows, menu rows, settlements. Run once per mount, never on data refresh.

### 3. Tactile interaction states
- Global press feedback: `.btn`, `.chip`, `.nav-button`, `.number-pad button`, `.menu-list button/a`, `.transaction`, `.method-slide.add`, `.order-actions button` get `transition: transform, box-shadow, background-color var(--dur-fast)`, with `:active` hard-shadow press (translate 2 to 3 px, shadow shrinks) and a `@media (hover: hover)` lift of -2 px.
- Focus-visible ring animates in (outline offset transition).
- Toggles/checkbox rows: animated check (scale spring) and background fade.
- Bottom nav: active indicator pill that slides between items (CSS `translateX` driven by an index CSS variable) and icon bounce on activation.

### 4. Overlays with exit animations
- `Sheet` and `ConfirmDialog` get a `closing` state: on close, play a 160 ms reverse animation (sheet slides down, backdrop fades) before calling `onClose`. Implement inside a small `useExitAnimation` hook so callers are unchanged.
- Backdrop fades in over 160 ms. Sheet enters with `--ease-spring` (translateY 24 px, slight scale 0.98 to 1).
- Toasts: add exit (slide down and fade, 160 ms) and enter with spring.
- `PinGate` card scales in 0.96 to 1.

### 5. Speed up perceived and real latency (mock services and checkout)
- Reduce mock waits: framing 1400 to 700, liveness 400 to 250, enroll 1500 to 900, match 1500 to 800, authorize 1100 to 600, top-up 900 to 500, auth steps 700 to 400, lookup 900 to 500, refund 800 to 500, report 600 to 350, fallback method hop 500 to 300. Keep an optional `?slow` or DemoControls "Network speed" (Fast/Realistic) toggle that multiplies waits so realistic timings can be demoed. Default Fast.
- Checkout: capture timer 2200 to 1100 ms, steady hint at 450 ms, so a sale reaches the match result in about 2 seconds.
- Show optimistic UI where safe: button loading states appear within one frame, with the spinner replaced by a progress shimmer on the label.

### 6. Signature moments (make it feel cool, not just fast)
- **Amount display** in checkout: digits roll/pop in (each new digit scales 1.15 to 1 over 120 ms).
- **Balance and stats count-up**: a `useCountUp` hook animates numbers over 500 ms on first mount and when value changes (skipped under reduced motion). Applies to customer balance, merchant today total, sales count.
- **Success**: keep the flash but shorten to 450 ms, add radial pixel burst behind the PAID stamp (CSS only, 8 square particles with staggered transforms), stamp uses spring overshoot, and receipt lines reveal in sequence.
- **Failure**: gentle shake on the fail mark (once, 300 ms).
- **Face frame**: corner brackets animate inward as the state goes searching, steady, matched; scan line speed 1.3 s to 0.9 s; ring colour transitions over 200 ms (already present, extend to corners).
- **Enrollment progress**: step indicator fills with a transition rather than jumping.
- **Carousel**: add a parallax tilt of the next card and a 3D-less depth effect: non-active slides scale 0.96 and fade to 0.7 (transform and opacity only). Dots animate width on active.
- **Welcome**: hero orbits rotate slowly (20 s, linear) and the pixel logo does a one-time stepped "boot" entrance; headline lines reveal in a stagger.

### 7. Performance guardrails
- `will-change` only on elements actively animating (sheet, track) and removed afterwards. No animated blur or filter. The noise overlay stays static.
- Keep CSS-only for everything except count-up, exit animation hook and view-transition wrapper. No new dependencies.

## Files touched
`src/styles/tokens.css`, `src/styles/globals.css`, `src/app/router.tsx` (view transitions, direction), `src/App.tsx` (delayed Suspense fallback, keyed screen), `src/components/ui/Overlay.tsx` and `PinGate.tsx` (exit animation), `src/components/feedback/Toast.tsx`, `src/components/layout/BottomNav.tsx` (sliding indicator), new `src/app/useCountUp.ts`, `src/app/useExitAnimation.ts`, `src/app/prefetch.ts`, `src/features/merchant/checkout/Checkout.tsx` (timers, amount pop, success burst), `src/features/customer/home/CustomerHome.tsx` and `merchant/home/MerchantHome.tsx` (count-up, reveal), `src/features/customer/payment/PaymentMethods.tsx` (depth effect), `src/services/mock/*.ts` and `scenario.ts` (latency scale), `src/features/demo/DemoControls.tsx` (speed toggle).

## Verification
- `tsc --noEmit` and `pnpm build` pass; bundle stays under the 500 kB warning.
- Manual in preview: navigate every tab and drill-in/back (direction correct, no flash), open and close each sheet and dialog (exit plays, focus returns), run a full sale (about 2 s to match, success burst), toggle Motion off (everything instant, nothing broken), toggle `prefers-reduced-motion` (same).
- Check no layout shift during entrance animations and no animation replay on state updates (balance changes should count, lists should not re-stagger).
- Confirm 60 fps feel: no animation of width/height/top/left except the existing scan line (switch it to `transform`).

## Out of scope
Adding an animation library, Lottie, or sound design changes. Visual redesign of layouts or palette.
