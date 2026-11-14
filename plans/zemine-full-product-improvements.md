# Zemine Full-Product Improvement Plan

## Objective

Evolve the current retro mobile prototype into a polished, testable, and production-shaped market-neutral pilot for both customers and merchants. Preserve the distinctive retro visual identity while making the experience trustworthy, accessible, operationally realistic, and safe for biometric payments.

The product will remain one codebase with two strictly separated role workspaces. Customers enroll and manage their biometric identity and funding sources; only merchants initiate face-payment scans.

## Decisions and assumptions

- **Pilot type:** Deliver an investor/user-testing prototype first, then connect the same flows to production-shaped services.
- **Packaging:** One app and authentication system, with separate customer and merchant onboarding, navigation, permissions, and dashboards after role selection.
- **Initial network:** Closed-loop Zemine balance and ledger; external card/bank rails are represented through configurable funding and settlement adapters.
- **Market strategy:** Market-neutral global pilot. Currency, locale, transaction limits, identity requirements, disclosures, and providers must be configuration-driven. Demo defaults should use a neutral locale selector rather than hard-coded Japan-specific content.
- **Checkout consent:** The merchant enters the amount, turns a customer-facing review screen toward the customer, and starts capture only after the customer sees the merchant and amount. Face match plus liveness constitutes approval for low-value pilot transactions. Configurable high-value transactions require step-up authentication or are blocked in the pilot.
- **Privacy:** Raw face frames are processed ephemerally and discarded. Only an encrypted, revocable biometric template/vector reference is retained. UI copy must avoid absolute security claims such as “can’t be stolen.”
- **Provider strategy:** Define vendor-neutral biometric, identity-verification, funding, and settlement interfaces. The interactive prototype uses deterministic mock adapters; real providers are a later environment-specific integration and cannot be represented as production-complete until selected and security-reviewed.

## Current-state findings

The current implementation already provides role selection, login, role-specific dashboards, customer identity status, wallet, merchant amount entry, a simulated scan, activity, and account screens. Important gaps are:

1. Customer enrollment jumps directly to activation and does not capture permission, consent, quality, liveness, duplicate enrollment, or recovery states.
2. Merchant checkout does not show a customer-facing amount/merchant review before camera capture.
3. Payment always succeeds after a timer; no no-match, multiple-face, camera-denied, timeout, insufficient-funds, duplicate-charge, offline, cancellation, or manual-fallback states exist.
4. Authentication fields are demo-filled and “Email or phone” is implemented as an email-only input. Forgot-password and account settings rows do not work.
5. Merchant onboarding omits business verification, settlement details, staff permissions, device binding, and camera readiness.
6. Filters, exports, funding rows, refunds, and many profile controls are decorative.
7. State is local to one component; there is no route history, persistence, domain model, service boundary, or role authorization.
8. Accessibility is incomplete: several icon-only controls lack names, focus styling is partial, animation has no reduced-motion mode, status changes are not announced, and some text is too small.
9. Content is hard-coded to JPY, Japanese locations, fixed names, and fixed timestamps despite the market-neutral goal.
10. The one-line component implementations and monolithic CSS will make further iteration risky.

## Target information architecture

### Shared, unauthenticated

1. Brand introduction
2. Choose customer or merchant workspace
3. Sign in / create account
4. Email or phone verification
5. Password recovery
6. Legal consent and privacy summary
7. Locale, language, and currency selection

### Customer workspace

Bottom navigation: **Home, Wallet, Activity, Account**.

- Home: balance, enrollment state, nearby acceptance count, latest activity, important alerts.
- Face identity: not started, consent, camera permission, guided capture, liveness, processing, success, suspended, revoke, and re-enroll.
- Wallet: balance, funding sources, add money, withdrawal where supported, limits, and primary source.
- Activity: search/filter, transaction details, receipt, report issue, and refund status.
- Account: profile, privacy controls, biometric consent history, security, notifications, locale, help, and sign out.

The customer workspace must never contain an “Accept payment” or “Scan customer” action.

### Merchant workspace

Bottom navigation: **Dashboard, Take payment, Sales, Account**.

- Dashboard: shift status, today’s gross/net sales, payment count, pending settlement, latest transactions, and operational alerts.
- Take payment: amount, optional order reference, customer review, camera permission, scan, match/liveness status, merchant confirmation, processing, receipt.
- Sales: filter/search, transaction details, refunds, receipt reissue, disputes, and export.
- Settlements: available/pending balances, payout account, payout history, and reconciliation.
- Account: business profile, verification, stores/devices, staff and roles, limits, security, locale, and help.

## Detailed flow improvements

### 1. Authentication and role onboarding

- Replace the ambiguous single field with an explicit email/phone segmented choice or a validated identifier field.
- Remove prefilled credentials outside a clearly labeled demo mode.
- Add loading, invalid credentials, locked account, unverified contact, offline, and server-error states.
- Implement verification-code entry with resend countdown and accessible paste/autofill behavior.
- Customer signup collects minimum identity details, accepted legal documents, locale, and age/eligibility confirmation.
- Merchant signup collects legal business name, trading name, country, business type, owner/admin identity, settlement account, store details, and business-verification state.
- Bind the first merchant device after camera and security checks; create a staff/admin PIN or passkey for sensitive actions.
- Preserve selected role through authentication and reject unauthorized role routes.

### 2. Customer biometric enrollment

Implement enrollment as a resumable state machine:

1. Explain what is captured, what is retained, why it is needed, retention/revocation, and fallback options.
2. Capture explicit consent with document version and timestamp.
3. Request camera permission in context; provide settings guidance if denied.
4. Guided framing with real-time quality prompts: lighting, distance, face centered, remove obstruction, and only one face.
5. Liveness challenge appropriate to the selected provider.
6. Generate the encrypted template through `BiometricProvider.enroll`; immediately discard source frames.
7. Check duplicate enrollment and handle inconclusive/failed quality results.
8. Confirm activation, supported transaction limit, recovery method, and how to revoke.
9. Allow suspend, revoke, and re-enroll from privacy settings with reauthentication.

Prototype adapters should expose controls to simulate success, camera denial, low light, duplicate identity, and liveness failure for testing.

### 3. Merchant face-payment checkout

Use an explicit transaction state machine:

`draft → customer_review → camera_permission → capturing → matching → matched → authorizing → succeeded`

Terminal/recovery states:

`cancelled`, `no_match`, `multiple_faces`, `liveness_failed`, `insufficient_funds`, `limit_exceeded`, `offline`, `authorization_failed`, `duplicate_detected`, and `unknown_result`.

Flow details:

1. Merchant enters amount using localized minor-unit handling, with configurable min/max and no invalid leading-zero behavior.
2. Optional order/reference field supports reconciliation.
3. Show a high-contrast customer-facing review with merchant name, store, amount, currency, “Look at the camera to approve,” privacy link, and cancel affordance.
4. Request camera only after review. Never display a synthetic face illustration as though it were a live feed; use an explicit prototype camera placeholder until camera integration exists.
5. During capture, provide quality guidance and a visible cancel action. Never expose a confidence percentage to ordinary merchant staff.
6. On match, display only the minimum identity needed to prevent mistakes, such as first name plus masked surname or customer-approved alias; avoid exposing full identity.
7. Confirm the amount one last time, then create an idempotent authorization request.
8. Show processing separately from success; do not treat a match as payment success.
9. Success receipt includes amount, merchant, timestamp, payment/reference ID, funding type, and receipt options.
10. Unknown-result states instruct the merchant not to retry blindly and provide a “Check transaction status” action to prevent double charging.
11. No-match and payment-declined states offer retry, alternate payment, or cancel without revealing sensitive reasons to bystanders.
12. Above the configured low-value threshold, invoke a configurable `StepUpPolicy`; the market-neutral pilot may block the transaction or request a merchant/customer fallback rather than pretending unlimited face-only authorization is safe.

### 4. Ledger, funding, settlements, refunds, and disputes

- Model payment matching and money movement separately: biometric match, authorization, ledger posting, settlement, refund, and dispute each have their own statuses.
- Customer transaction detail shows merchant, amount, funding source, status timeline, receipt ID, support/report action, and refund progress.
- Merchant transaction detail shows gross, fee, net, staff/device, order reference, settlement batch, refund eligibility, and audit trail.
- Implement full and partial refund confirmation with permissions, reason, idempotency, and result states.
- Make activity filters functional and preserve them while navigating into details.
- Export creates a dated CSV in the prototype and uses an asynchronous export job interface in production.
- Funding source actions include add, verify, set primary, remove, and failure/retry states.
- Settlement views distinguish available, pending, paid, failed, and held funds.

### 5. Trust, privacy, and content

- Replace vague “bank-grade” and absolute safety claims with specific, reviewable statements.
- Add a plain-language privacy center: stored data, non-stored data, consent log, data export, suspend/revoke identity, account deletion, and support escalation.
- Clearly distinguish identity verification from payment authorization.
- Add contextual notices for shared merchant devices and prevent customer data from remaining visible after checkout.
- Auto-reset the merchant checkout after receipt timeout and clear customer details immediately.
- Use market configuration for legal copy and links; do not imply one global policy satisfies every jurisdiction.

### 6. Visual and interaction polish

- Keep the cream, ink, orange, yellow, and green retro palette, bold borders, geometric illustration, and display type.
- Increase body/support text to accessible mobile sizes; reserve tiny monospaced labels for nonessential metadata.
- Reduce decorative noise behind forms and camera states to emphasize trust and legibility.
- Standardize spacing, radii, border widths, shadows, typography, status colors, and motion as CSS design tokens.
- Create reusable primitives for buttons, icon buttons, fields, cards, badges, banners, bottom sheets, dialogs, empty states, skeletons, and toasts.
- Add pressed, disabled, loading, error, success, focus-visible, and selected states for every interactive component.
- Add screen transitions only where they communicate hierarchy; honor `prefers-reduced-motion`.
- Support safe-area insets, 320–430 px phones, larger phones, landscape merchant checkout, text zoom, and desktop preview framing.
- Keep the checkout amount and state visible above the fold on common merchant devices.

## Technical implementation approach

### Project structure

Refactor the monolithic component without changing product behavior first:

```text
src/
  app/
    App.tsx
    routes.tsx
    providers.tsx
  components/
    ui/
    layout/
    feedback/
  features/
    auth/
    customer/
      enrollment/
      wallet/
      activity/
    merchant/
      checkout/
      sales/
      settlements/
    account/
  domain/
    types.ts
    money.ts
    policies.ts
  services/
    contracts.ts
    mock/
    production/
  config/
    markets.ts
  styles/
    tokens.css
    globals.css
```

- Introduce route-based navigation so browser back, deep links, screen refresh, and guarded routes work. Use a routing package only after adding it explicitly to `package.json`; otherwise implement a small History API router behind one interface.
- Keep server/domain state out of view components. For the first pass, use React context plus reducer/state machines; do not add a state library unless complexity proves it necessary.
- Persist only safe demo preferences locally. Never persist raw biometric frames or secrets in browser storage.
- Keep all fixtures in mock service modules rather than components.

### Core domain types

Define at minimum:

- `User`, `CustomerProfile`, `Merchant`, `Store`, `StaffMember`, `Device`
- `BiometricEnrollment`, `BiometricConsent`, `BiometricMatchResult`
- `Money { amountMinor, currency }`
- `FundingSource`, `WalletBalance`
- `PaymentIntent`, `PaymentAuthorization`, `Transaction`, `LedgerEntry`
- `Settlement`, `Refund`, `Dispute`
- `MarketConfig`, `StepUpPolicy`, and typed error/result unions

All money calculations use integer minor units and `Intl.NumberFormat`; never parse or calculate monetary values using formatted strings.

### Service contracts

Provide mock and future production implementations for:

- `AuthService`
- `IdentityVerificationService`
- `BiometricProvider`
- `WalletService`
- `PaymentService`
- `SettlementService`
- `ExportService`
- `AuditService`

Critical write operations accept idempotency keys. Biometric methods receive ephemeral capture references/streams and return typed results, not stored image data. UI code must not depend on a specific biometric or payment vendor.

### Production-shaped backend boundary

For the production phase, use server-side authentication/authorization, a relational ledger database, row/tenant isolation, signed audit events, encrypted sensitive fields, key management outside application code, rate limiting, device/session revocation, and observability with biometric payload redaction. Never authorize money movement solely from a client-side match result. The server verifies provider assertions, transaction limits, merchant/device status, customer status, and idempotency before posting the ledger transaction.

Provider selection, biometric accuracy testing, threat modeling, data-protection impact assessment, jurisdiction-specific consent, PCI scope, money-transmission/e-money obligations, and penetration testing are launch gates rather than UI tasks.

## Failure and edge-case matrix

Every relevant flow must include designed and testable handling for:

- Camera unavailable, denied, interrupted, or in use
- Low light, poor angle, obstruction, no face, or multiple faces
- No biometric match, ambiguous match, spoof/liveness failure, or provider timeout
- Enrollment already exists, enrollment suspended, consent withdrawn, or re-enrollment required
- Customer inactive, insufficient funds, payment source expired, daily limit reached, or high-value step-up required
- Merchant unverified, device untrusted, staff unauthorized, shift closed, or settlement account invalid
- Offline before authorization, disconnect during authorization, delayed result, duplicate submit, and retry after unknown result
- Refund ineligible, partial refund exceeds remaining amount, or settlement already in progress
- Locale with zero/three decimal currency units, long translated labels, right-to-left layout readiness, and timezone boundaries
- Session expiry during a sensitive action and role change in another session

## Accessibility requirements

- Target WCAG 2.2 AA for contrast, keyboard operation, focus visibility, labels, status announcements, and touch targets.
- Add accessible names to every icon-only control and `aria-current` to active navigation.
- Announce scan/payment state changes with a polite live region; errors requiring immediate action use assertive announcements sparingly.
- Do not communicate payment state through color alone.
- Provide reduced-motion alternatives and avoid continuously moving scan effects when reduced motion is enabled.
- Test at 200% text zoom, keyboard-only, VoiceOver/TalkBack semantics, and 320 px viewport width.
- Provide a non-biometric enrollment and checkout fallback path for accessibility and failed recognition.

## Delivery phases

### Phase 1 — Foundation and polished prototype

1. Extract tokens and reusable UI primitives.
2. Split components by feature and introduce route/history handling.
3. Add market configuration, money utilities, fixtures, and mock services.
4. Rebuild authentication and separate customer/merchant onboarding.
5. Implement complete customer enrollment state machine.
6. Implement complete merchant checkout state machine and customer review screen.
7. Implement functional activity details, filters, refunds, funding controls, settlement screens, and account settings.
8. Add all priority error/recovery states and demo scenario controls.
9. Complete responsive and accessibility pass.

**Exit criteria:** Every primary and failure flow can be exercised without dead controls; role boundaries are correct; refresh/back navigation is stable; usability-test participants can complete enrollment and payment without facilitator explanation.

### Phase 2 — Production-shaped service integration

1. Implement authentication, role authorization, tenant/store/device model, and audit trail.
2. Implement closed-loop wallet and double-entry ledger APIs.
3. Connect sandbox funding and settlement adapters.
4. Integrate a selected audited biometric provider behind `BiometricProvider`.
5. Add server-side payment policy, idempotency, limits, and reconciliation.
6. Add secure telemetry, monitoring, fraud/risk hooks, and administrative support tooling.

**Exit criteria:** Sandbox money movement reconciles; duplicate submissions do not duplicate charges; role and tenant isolation tests pass; biometric media is demonstrably not persisted; all provider failures map to safe UI outcomes.

### Phase 3 — Pilot hardening

1. Complete market-specific legal/compliance review for the selected launch jurisdiction.
2. Conduct threat modeling, privacy impact assessment, biometric bias/accuracy testing, accessibility audit, and penetration testing.
3. Run merchant training and customer usability pilots across lighting, device, demographic, and connectivity conditions.
4. Tune thresholds, limits, fallback policy, copy, and support operations from pilot evidence.
5. Add release monitoring, incident response, account recovery, and data-subject request operations.

**Exit criteria:** Legal/security launch gates are signed off, operational runbooks exist, fallback payment is available, and defined accuracy/latency/support thresholds are met.

## Verification strategy

### Automated

- Unit tests for money formatting/parsing, market policy, state transitions, permissions, and typed error mapping.
- Component tests for forms, validation, keyboard behavior, loading/error states, and live-region announcements.
- Integration tests for enrollment, merchant checkout, unknown-result recovery, refunds, and role guards using mock services.
- End-to-end tests for customer signup/enrollment and merchant payment/refund across success and critical failure paths.
- Accessibility automation plus manual screen-reader and keyboard review.
- Production build and formatting checks through repository scripts.

### Manual scenario checklist

1. New customer signs up, verifies contact, consents, completes enrollment, funds wallet, and reviews activity.
2. New merchant completes business/device setup, opens a shift, accepts a payment, and sees it in pending settlement.
3. Customer reviews the exact amount before capture and can cancel safely.
4. No-match, camera denial, insufficient funds, offline, duplicate tap, and unknown authorization all recover without accidental charge.
5. Merchant issues a partial refund and both parties see consistent statuses.
6. Customer suspends/revokes identity and can no longer be matched.
7. Staff without refund permission cannot perform a refund.
8. Locale/currency changes update amounts, dates, and copy without hard-coded JPY artifacts.

## Definition of done

- Customer and merchant roles have separate, coherent, end-to-end journeys.
- Only merchants initiate scans; customers explicitly review the merchant and amount before capture.
- Enrollment, payment, refund, funding, settlement, and recovery interactions are functional in prototype mode.
- No decorative control is presented as functional unless it works; unavailable production capabilities are clearly labeled as simulated or sandboxed.
- Privacy claims are accurate, configurable, and supported by the service boundary.
- All critical failure states are designed and testable.
- Responsive behavior and WCAG 2.2 AA requirements are met for the pilot scope.
- The production integration boundary, security gates, and remaining provider decisions are explicit rather than hidden behind the prototype.
