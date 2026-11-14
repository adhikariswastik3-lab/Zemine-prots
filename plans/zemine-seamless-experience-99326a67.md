# Zemine: seamless and delightful experience (Phase 1.5)

## Goal
Make the verified Phase 1 prototype feel fast, trustworthy and distinctive for both roles, without changing role separation: customers enroll and manage funds, only merchants start a face scan.

## Principles
- A payment takes under 10 seconds and no more than 3 taps for the merchant.
- The customer is never surprised: consent, control and a receipt for every charge.
- Retro identity (cream/ink/orange, thick borders, Righteous + DM Mono, pixel Z logo) shows up in feedback moments, not as decoration.

## Merchant improvements
1. **Keypad-first checkout.** Open straight to a large pixel-style keypad, amount in Righteous, quick-amount chips from recent sales, and a single "Charge" button that starts the scan. No extra continue step.
2. **Continuous scan with guidance.** Pixel face frame that changes color (orange searching, yellow hold still, green matched), plain hints ("Move closer", "More light"), auto-capture when the face is steady. No manual shutter.
3. **Result moment.** Success: green flash, pixel Z stamp animation, haptic (`navigator.vibrate`), optional tone; "New sale" is the primary action. Failures show one clear next action (rescan, retry, cancel).
4. **Shift view on home.** Today total, sale count, hourly sparkline, next payout, "Repeat last amount" shortcut.
5. **Refund and receipt in two taps**, with shareable text receipt.
6. **Staff safety.** Optional 4-digit PIN to open checkout and to refund.
7. **Offline.** Banner and blocked charge state; never queue a face payment silently.

## Customer improvements
1. **Guided enrollment.** Three stages (consent, capture, confirm), live liveness prompts, retake, short consent text with "Learn more" sheet.
2. **Control center on home.** "Allow face payments" toggle (maps to active/suspended), per-payment and daily limits, status chip (Enrolled, Paused, Needs setup).
3. **Instant payment notice.** New activity row slides in with merchant and amount plus "Not you? Report"; demo shows a push-style toast.
4. **One-step top-up.** Presets, remembered method, clear pending/confirmed states.
5. **Delete my face data** in Account with confirmation and a deletion receipt.
6. **Low-balance nudge** with top-up shortcut.

## Shared polish
- Logo on welcome, header and a pixel-Z loader/splash (respect reduced motion).
- Two distinct role cards on welcome; friendly guard screen for the wrong workspace.
- Skeleton loaders, consistent empty states.
- Preferences (sound, haptics, motion) in Account.
- Accessibility: focus rings, `aria-live` results, 44px targets, camera denied/no camera/insecure context states.
- Performance: lazy-load each role workspace so the main chunk is under 500 kB.

## Implementation steps
1. Add `src/components/ui/Keypad.tsx`, `FaceFrame.tsx`, `ResultStamp.tsx`, `Skeleton.tsx`, `Toggle.tsx`.
2. Rework checkout machine: `amount -> scanning -> matching -> result`, with steady-face auto-capture in `Camera.tsx` (timer-based mock detection in demo).
3. Add preferences store (`sound`, `haptics`, `motion`, `pin`) in `app/session.ts` with localStorage.
4. Extend mock customer data with `limits` and `facePaymentsEnabled`; tie toggle to enrollment status.
5. Add merchant PIN gate and customer report-payment action to mock services and `contracts.ts`.
6. Lazy routes and guard screen in `app/routes.tsx`.
7. Keep copy consistent: scanning is merchant-only; customers see "enrollment" and "face payments allowed".

## Verification
- `tsc --noEmit` and `pnpm build` pass; main chunk under 500 kB.
- Demo scenarios: success, no match, liveness fail, low balance, offline, camera denied, paused customer, refund, PIN right/wrong.
- Customer has no route to scan; merchant URL as customer shows the guard screen.
- Keyboard-only and screen-reader pass on checkout and enrollment.

## Out of scope
Real biometric vendor, payment rails, push notifications, multi-staff accounts (Phase 2/3).
