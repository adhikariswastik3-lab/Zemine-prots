# Zemine Phase 1: foundation and polished prototype

## Context
`src/App.tsx` is a 116-line file of dense one-line components. `src/index.css` is plain CSS with hex values repeated throughout and 8-12px text. There is no router, no validation, no error states, no role guards, and several dead controls.
Phase 1 of `plans/zemine-full-product-improvements.md` fixes this. It extracts tokens and primitives, splits the code by feature, adds market config and mock services, and rebuilds auth, enrollment and merchant checkout as state machines with error and recovery states.
Visuals stay the same: cream, ink, orange, yellow and green, hard borders and shadows, DM Mono and Righteous, and the noise texture.

## Approach
Work in 6 steps. Run `pnpm build` (tsc and vite) after each step so the app stays working.

1. **Tokens and primitives**
   - Add `src/styles/tokens.css`, imported from `index.css`. It holds a Tailwind v4 `@theme` block (colors, fonts, shadows, radii, and a type scale with a 12px minimum for body text) and keeps the existing class names as aliases so nothing breaks mid-migration.
   - Add `src/styles/globals.css` with the noise overlay, the app shell, and `prefers-reduced-motion`.
   - Add `src/components/ui/`: Button, IconButton, Field, Card, Badge, Banner, Sheet, Dialog, EmptyState, Skeleton, Toast, and Icon (the SVG set from `App.tsx`, with a `className` and `aria-hidden`).
   - Add `layout/` (Screen, Header with a labelled back button, BottomNav with `aria-current`) and `feedback/` (live region).
2. **Domain, config and mock services**
   - `config/markets.ts` holds the market-neutral default market (currency, locale, limits, supported methods). Nothing is hard-coded to JPY.
   - `domain/money.ts` stores amounts as integer minor units and formats them with `Intl.NumberFormat`.
   - `domain/` also holds the types for user, role, transaction and checkout.
   - `services/contracts/` defines `AuthService`, `BiometricProvider`, `PaymentService` and `WalletService`.
   - `services/mock/` implements them with latency and a demo scenario switch (success, camera denied, low light, duplicate, liveness fail, no match, insufficient funds, offline, unknown result).
   - `fixtures/` replaces the inline transaction arrays.
3. **Routing, state and role guards**
   - Add `react-router`, which is a new dependency. I will confirm its API before using it.
   - Use `/customer/*` and `/merchant/*` route trees with a `RequireRole` guard.
   - Refresh and back navigation must work. A customer cannot reach `/merchant/checkout`.
   - Session and role live in a context with a reducer (no state library), persisted to `sessionStorage`.
   - Preserve the `main.tsx` entrypoint. `App.tsx` becomes a thin shell, and the code moves to `src/app/` and `src/features/`.
4. **Auth as a state machine**
   - Welcome, then role choice, then credentials (segmented email or phone, no prefilled values outside a labelled demo mode).
   - Next come a verification code step (with a resend countdown) and recovery (forgot password).
   - Customer and merchant signup are separate. Merchant signup adds business details, settlement and device binding.
   - Inline validation, a loading state, and error banners for wrong code, locked account and offline.
5. **Customer enrollment state machine** (`features/customer/enrollment`)
   - States: `explain → consent (version and timestamp) → camera_permission → framing → liveness → enrolling → duplicate_check → active`.
   - Failure and recovery states: `permission_denied`, `low_light`, `liveness_failed`, `duplicate`, `error`. Also suspend, revoke and re-enroll from the account screen.
   - Use real `getUserMedia` where it is available, with a fallback guide. Raw frames are never stored. Do not render a fake face as a live feed.
   - Copy makes no absolute security claims.
6. **Merchant checkout state machine** (`features/merchant/checkout`)
   - States: `draft → customer_review → camera_permission → capturing → matching → matched → authorizing → succeeded`.
   - Terminal and recovery states: `cancelled`, `no_match`, `multiple_faces`, `liveness_failed`, `insufficient_funds`, `limit_exceeded`, `offline`, `authorization_failed`, `duplicate_detected`, `unknown_result`.
   - Use a pure reducer with typed events, idempotency keys, and a receipt generated from the transaction.
   - Add a customer-facing review screen and an auto-reset after success.
   - Replace the dead controls: activity filters and detail, refund, funding controls, settlements, and account settings.

## Critical files
- Modify: `src/App.tsx`, `src/index.css`, `package.json` (router).
- Create: `src/app/`, `src/components/{ui,layout,feedback}/`, `src/features/{auth,customer/{enrollment,wallet,activity},merchant/{checkout,sales,settlements},account}/`, `src/domain/`, `src/services/{contracts,mock}/`, `src/config/markets.ts`, `src/styles/`.
- Reuse: the existing CSS look (`.primary-button` shadows, `.balance-card`, `.noise`), the SVG paths in `Icon`, and the `@/` alias already set in `tsconfig.json` and `vite.config.ts`.

## Verification
- `pnpm build` passes after each step.
- In the preview, walk through these flows:
  - Signup and login for each role, including code failure and resend.
  - Enrollment: the happy path, plus camera denied, low light, duplicate and liveness failure from the demo controls, then revoke and re-enroll.
  - Checkout: the happy path, plus every recovery state, and check the receipt.
- Check role boundaries by typing `/merchant/checkout` while signed in as a customer, and check refresh and back navigation.
- Check 320 and 430px widths, keyboard focus, `aria-current` and `aria-label`s, reduced motion, and that no control is dead.

## Out of scope
Phases 2 and 3 (real backend, real biometric provider, pilot hardening).
