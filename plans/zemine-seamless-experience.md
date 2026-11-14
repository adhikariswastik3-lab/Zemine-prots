# Zemine: seamless and delightful experience (Phase 1.5)

## Goal
Make the verified Phase 1 prototype feel fast, trustworthy and distinctive for both roles, without changing the role separation: customers enroll and manage funds, only merchants start a face scan.

## Principles
- A payment should take under 10 seconds and no more than 3 taps for the merchant.
- The customer is never surprised. They see consent, control and a receipt for every charge.
- Retro identity (cream/ink/orange, thick borders, Righteous + DM Mono, pixel Z logo) is used for personality in moments of feedback, not as decoration.

## Merchant improvements
1. **Keypad-first checkout.** Open straight to a large pixel-style keypad. Show the amount in Righteous, add quick-amount chips (recent amounts) and a "Charge" button that doubles as the scan trigger. Remove any extra "continue" step.
2. **Continuous scan with guidance.** Camera overlay with a pixel face frame that changes color (orange searching, yellow hold still, green matched). Plain-language hints ("Move closer", "More light"). Auto-capture when the face is steady. No manual shutter.
3. **Result moment.** Success: full-screen green flash, pixel Z stamp animation, a short haptic (`navigator.vibrate`) and a success tone (muted by default, toggle in settings), then "New sale" as the primary action. Failure screens give one clear next action (rescan, retry, cancel).
4. **Shift view on home.** Today total, sale count, a tiny hourly bar sparkline, and next payout. Add "Repeat last amount" shortcut.
5. **Refund and receipt in two taps** from a sale. Share receipt as a text summary.
6. **Staff safety.** Optional 4-digit PIN to open checkout and to refund, so a shared phone cannot take or reverse payments.
7. **Offline and weak network.** Banner plus clear blocked state on charge. Never queue a face payment silently.

## Customer improvements
1. **Guided enrollment with progress.** Three pixel-step stages (consent, capture, confirm), a live liveness prompt, and a retake option. Consent text is short with a "Learn more" sheet.
2. **Control center on home.** One toggle "Allow face payments" (pause/resume instantly), a per-payment limit slider and a daily limit. Show the status chip: Enrolled, Paused or Needs setup.
3. **Instant payment notice.** A new activity row slides in with merchant, amount and "Not you? Report" action. Mock a push-style toast in the demo.
4. **Top-up in one step.** Preset amounts, last method remembered, clear pending/confirmed states.
5. **Delete my face data** in Account with a plain confirmation and a receipt of deletion.
6. **Low-balance nudge** with a top-up shortcut when balance is under the per-payment limit.

## Shared polish
- Use the logo on welcome, header and loading; add a pixel-Z loader and animated splash (respect reduced motion).
- Role switcher on welcome shows two distinct cards with illustration and one-line promise. Wrong-workspace route shows a friendly redirect screen.
- Skeleton loaders instead of spinners, optimistic UI where safe, consistent empty states.
- Sound, haptics and motion toggles under Account > Preferences.
- Accessibility: focus rings, `aria-live` for scan and payment results, 44px minimum targets, reduced-motion fallbacks, camera permission denied/no camera/insecure context screens.
- Performance: lazy-load each role workspace (`import()`), bundle under 500 kB warning.

## Implementation steps
1. Add `src/components/ui/Keypad.tsx`, `FaceFrame.tsx`, `ResultStamp.tsx`, `Skeleton.tsx`, `Toggle.tsx`.
2. Rework `merchant/checkout` machine: states `amount -> scanning -> matching -> result`, with steady-face auto-capture in `Camera.tsx` (mock detection via timer in demo).
3. Add preferences store (`sound`, `haptics`, `motion`, `pin`) in `app/session.ts` with localStorage persistence.
4. Extend mock customer data with `limits` and `facePaymentsEnabled`; wire the toggle to enrollment status (`active` / `suspended`).
5. Add merchant PIN gate and customer report-payment action to mock services and `contracts.ts`.
6. Route-level lazy loading and guard screen in `app/routes.tsx`.
7. Update copy to keep face scanning merchant-only language and customer language as "enrollment" and "face payments allowed".

## Verification
- `tsc --noEmit` and `pnpm build` pass; main chunk under 500 kB.
- Manual scenarios via the demo controls: success, no match, liveness fail, low balance, offline, camera denied, paused customer, refund, PIN wrong/right.
- Customer account has no route to scan; typing a merchant URL as customer shows the guard screen.
- Keyboard-only and screen-reader pass on checkout and enrollment.

## Out of scope
Real biometric vendor, real payment rails, real push notifications, multi-staff accounts (Phase 2/3).
