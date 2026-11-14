# Zemine: founder-level product and design strategy

## 1. The thesis (what we are actually selling)
Face payment is not a payments problem, it is a **trust problem**. Speed is table stakes (we are already at about 2 seconds). The product that wins is the one where a customer feels safe walking up to a stranger's phone and letting it recognise them.

So Zemine's position is: **"Pay by showing up. You stay in control."**
- Merchants get the fastest checkout in the shop (no card, no phone, no QR).
- Customers get a visible, instantly reversible grip on their own face: who scanned, when, how much, and one tap to pause everything.

Everything below is judged against two questions: does it make paying faster, or does it make people trust it more? If neither, cut it.

## 2. Wedge and go-to-market (decide this before more features)
- **Pilot wedge:** high-frequency, low-ticket, repeat-customer venues. Coffee shops, canteens, campus and office cafeterias, food courts. Same faces, same place, daily. Enrollment pays back in a week.
- **Chicken-and-egg answer:** merchant-assisted enrollment. The cashier invites a regular ("Pay with your face next time, 30 seconds") and the customer enrolls on their own phone via a QR on the counter. No app-store step, no pre-existing network needed. Merchants become the acquisition channel.
- **Market-neutral global pilot stays.** Do not add markets. Add depth in one.
- North-star metric: **repeat face payments per enrolled customer per week.** Supporting: time-to-pay p50 under 3 s, enroll-to-first-pay under 24 h, false-match reports at zero, dispute rate under 0.5 percent.

## 3. Do not follow these fads (undone list)
1. **Fake "AI scanner" theatre.** The simulated biometric HUD shows invented numbers ("LOCKING 48%", "MATCH 99.8%", scrolling hash). Sci-fi telemetry is the most overused face-tech cliche and, worse, fake precision erodes trust. Replace with calm, honest feedback (see section 5). Keep the mesh only as a clearly labelled demo-mode stand-in.
2. **Emoji and gimmick labels** (the camera pill currently uses emoji, which also breaks our own no-emoji rule). Use the icon set.
3. **Neon gradients, glassmorphism, dark cyber mode.** Our cream, ink and orange pixel identity is already a differentiator. Do not dilute it to look like every fintech.
4. **Gamification, points, streaks, confetti-everything.** Money is not a game. One signature moment (the stamp) is enough.
5. **Crypto, web3, "decentralised identity" language.** Adds suspicion, not trust.
6. **An AI chatbot or assistant.** No real problem it solves here.
7. **Social features and leaderboards.** Wrong emotional register for payments.
8. **Feature parity with banks** (budgeting, analytics, savings). We are a payment rail with a great front door, not a neobank.
9. **Parallel payment modes** (QR, NFC, links) beyond what exists. One mode done perfectly beats four done adequately. The `qr_payment` ledger kind is legacy; leave it, do not extend it.
10. **Over-animation.** The motion pass is enough. From here, motion only communicates state or consent.

## 4. Do this instead (the "new fad" we create)
Our design thesis: **"Receipts, not dashboards."** Payments are physical moments, so the app should feel like a precise, friendly piece of paper and ink: stamps, perforations, ledgers, thick borders. Nobody in biometrics looks like this. It is our brand, our trust language and our screenshot-able identity.

### 4.1 Signature features (build in this order)
1. **Trust Ledger (customer).** Replace "Activity" framing for face scans with a ledger that shows every scan event, including declined and unmatched ones: merchant, time, amount, outcome, method used. Not just successful payments. Transparency is the product. Each row has "Not me" (already built as Report) and the whole ledger has one loud **Pause all face payments** button on the home screen.
2. **Face Receipt.** After each payment the customer gets a stamped receipt moment (push-style toast already exists) that can be tapped for the paper-style receipt and a one-tap dispute. This doubles as our marketing surface (shareable "I paid with my face" card without any personal data).
3. **Consent that is readable.** Replace the paragraph consent with three plain lines and icons: "We keep a template, not your photo", "Only merchants you pay can match you", "Delete it any time and it is gone". Add a "what the merchant sees" preview (first name and initial only).
4. **Merchant Counter Mode.** A tablet-on-a-stand mode: always-on attract screen ("Pay with your face"), amount set by the cashier with one tap from a few saved prices, auto-start the scan when a face is in frame, auto-reset after success. This is what makes it fast in a real queue and is the demo that sells.
5. **Merchant-assisted enrollment.** Counter QR that opens the customer enrollment on their own phone, plus a merchant-side "invite a regular" prompt after a QR sale. This is the growth loop.
6. **Step-up for bigger amounts.** Express auto-charge stays for small tickets. Above a customer-set threshold (default about 25 percent of the per-payment limit), require a second signal: a gesture (blink twice or smile, reusing the liveness prompts) or a spoken confirm. This keeps speed for coffee and safety for groceries, and it directly answers the lookalike and spoofing fear.

### 4.2 Honest feedback in the scanner (replace the HUD)
- Three states only, in plain words: **Looking** (orange), **Hold still** (yellow), **Got you** (green) plus the customer's first name when matched.
- Remove fake percentages, hashes and telemetry. Show a real signal if one exists (frame quality, light) and nothing otherwise.
- Keep the corner brackets and the stamp. They are on-brand and honest.
- Demo mode: label clearly "Demo face" so nobody mistakes it for a live scan.

### 4.3 Brand and design system consolidation
- Typography: Righteous only for numbers, headlines and the stamp. DM Mono for everything else. No third font.
- One accent per screen: orange is the action, yellow is attention, green is success. Never two attention colours at once.
- Elevation language: hard-offset shadows only, 3 sizes (sm, md, lg). Remove any soft blur shadow.
- Iconography: pixel-influenced 2 px strokes only; commission or hand-draw a small set (face, scan, wallet, shield, stamp) rather than mixing styles.
- Logo: use the pixel Z everywhere as the single brand mark. Add a one-line wordmark lockup "Zemine" in Righteous. Do not add a mascot.
- Voice: short, literal, warm. "You were charged $6.80 at Kissa Coffee." not "Transaction successful". Audit every string.

## 5. Product quality bar (the unglamorous things that win)
- **Speed budget:** amount entry to success in under 3 s on a mid-range phone; first paint under 1.5 s; no layout shift.
- **Failure that feels fair:** every failure screen states what happened, whether money moved ("No charge was made"), and one next action. Already largely in place; audit copy.
- **Fallback chain visibility:** customers see which method paid (done in the detail sheet); add it to the receipt and the toast.
- **Accessibility as a feature:** a voice and large-text path for customers who cannot easily face a camera; never require the face as the only way to pay (offer the merchant QR or the PIN-protected fallback).
- **Privacy by default:** no photo stored, templates never leave the vendor, ledger exportable and deletable. State it in-product, not just in a policy.

## 6. What to cut or simplify in the current build
| Item | Decision | Why |
| --- | --- | --- |
| Simulated HUD telemetry (hash, fake %) | Replace with honest 3-state feedback | Fake precision, fad aesthetic |
| Emoji in camera mode pill | Replace with icons, move toggle to demo controls | Breaks design rules, clutters scanner |
| Live/Simulated toggle visible to real users | Show only in `DEMO_MODE` | Production users should never see it |
| Customer review screen | Keep removed; keep the amount on the scanner | Done |
| Per-payment limit slider on home | Move into the Trust section with step-up threshold | Home should be calm: balance, status, one big pause |
| Notifications toggles (marketing) | Remove "News and offers" | Wrong signal for a trust product |
| Team and permissions sheet | Keep, but hide until Phase 2 data exists | Placeholder-feeling |
| Welcome hero copy "YOU ARE THE KEY." | Rewrite to the thesis line | Clearer promise |

## 7. Roadmap
### Now (1 to 2 weeks): trust and polish on the existing app
1. Replace the scanner HUD with the 3-state honest feedback; gate the mode toggle behind `DEMO_MODE`; remove emoji.
2. Rewrite consent into three plain lines with icons and the "what the merchant sees" preview.
3. Turn Activity (customer) into the Trust Ledger, including failed and unmatched scans, with the prominent Pause all button on home.
4. Add step-up verification above a customer-set threshold (reuses liveness gesture logic).
5. Copy and voice audit across all screens; unify shadows, icon strokes, accent rule.

### Next (3 to 6 weeks): growth loop and in-store reality
1. Merchant Counter Mode (attract screen, saved prices, auto-start, auto-reset).
2. Counter QR for merchant-assisted enrollment and "invite a regular".
3. Face Receipt screen with dispute and shareable privacy-safe card.
4. Phase 2 service contracts: replace mocks behind `src/services/contracts.ts` (biometric vendor, payments, auth), keep the mock as the demo adapter.

### Later: pilot hardening
Real liveness vendor and anti-spoofing evaluation, fraud rules and velocity limits, settlement reconciliation, support tooling, regional compliance review, merchant onboarding kit (counter sign, staff script).

## 8. Risks and how the plan addresses them
- **Spoofing and lookalikes:** vendor liveness plus step-up for larger amounts plus instant pause plus a visible ledger.
- **Privacy backlash:** consent in plain language, no photo retention, visible deletion, no marketing channel.
- **Cold start:** merchant-assisted enrollment in a dense, repeat-visit vertical.
- **Hardware variance:** Counter Mode recommends a fixed tablet; graceful low-light and no-camera states already exist.
- **Scope creep into banking:** the "undone" list is the guard rail.

## 9. Implementation notes for the "Now" phase
- `src/components/ui/Camera.tsx`: remove telemetry bar and fake status strings from `BiometricFaceMesh`; show `Looking / Hold still / Got you`; render the mode pill only when `DEMO_MODE`; use `Icon` instead of emoji; label demo face.
- `src/features/customer/enrollment/Enrollment.tsx`: replace the consent paragraph with three icon rows and a merchant-view preview card.
- `src/features/activity/ActivityScreen.tsx` and `src/services/mock/biometric.ts` and `payments.ts`: record scan events (matched, declined, no match) into a customer-visible `scans` list in `db.ts`; render as the Trust Ledger with outcome badges.
- `src/features/customer/home/CustomerHome.tsx`: add the Pause all button; move the limit slider and new step-up threshold to a Trust settings sheet.
- `src/features/merchant/checkout/Checkout.tsx` and `checkoutMachine.ts`: add a `stepup` state between `matched` and `authorizing` when amount exceeds the customer threshold; reuse liveness gesture prompts.
- `src/app/prefs.ts` and `db.ts`: add `stepUpThresholdMinor` (customer) with default derived from the market limit.
- Remove `News and offers` toggle; rewrite hero copy; audit strings.

## 10. Verification
- `tsc --noEmit` and `pnpm build` pass; main chunk stays under 500 kB.
- Manual: run a sale under the threshold (auto-charges, ledger records it), over the threshold (step-up prompt, then charge), a no-match scan (appears in the customer ledger as a declined scan), and tap Pause all (next merchant scan fails with a clear "paused" outcome and the ledger shows it).
- Visual QA against the design rules: one accent per screen, only hard shadows, no emoji, no fake numbers anywhere in the scanner.
- Copy audit checklist: every failure states whether money moved and one next action.

## 11. Decisions I made for you (change any of these)
1. Pilot vertical is cafes and canteens, not retail or transit.
2. Express auto-charge stays the default, with step-up above a threshold rather than a second tap on every sale.
3. The fake HUD telemetry goes; honesty beats spectacle.
4. Growth comes from merchant-assisted enrollment, not marketing.
5. We do not add payment modes, banking features or social features.
