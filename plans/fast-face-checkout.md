# Fast Face Checkout: 2-Step Streamlined Payment Flow

## Objective
Streamline the Merchant Face Payment checkout from the current 4-step process down to **2 seamless steps** (Express Auto-Pay) or **3 steps** (Scan + 1-Tap Pay), eliminating the pre-scan customer approval modal and redundant confirmation taps so face payments feel instantaneous, modern, and effortless.

---

## 1. Context & Bottleneck Analysis
Currently, taking a face payment requires 4 distinct stages:
1. **Enter Amount (Keypad)**: Merchant types digits -> taps "Ask customer to review".
2. **Customer Review Modal**: Merchant hands phone to customer -> customer reads amount -> customer taps "Approve and continue".
3. **Camera Face Scan**: Camera opens -> scans face -> matches customer.
4. **Merchant Match Confirmation**: Screen shows "Customer found: Zia S." -> Merchant must tap "Charge $X.XX" *again*.
5. **Processing & Receipt**: Spinner -> PAID stamp.

### Why this is slow and creates delays:
- **Redundant double confirmation**: The customer is asked to approve the amount *before* the scan, and then the merchant is asked to confirm the charge *after* the scan.
- **Physical phone handoff**: Handing a merchant POS phone back-and-forth twice per transaction is clunky and slows line speed at busy checkout counters.
- **Biometric industry standard**: In systems like Amazon One, PopID, and Alipay Smile to Pay, looking directly into the camera while the amount is visible on-screen **is** the customer's affirmative consent. No pre-approval screen is necessary.

---

## 2. Target Design: Express 2-Step Flow (Default & Recommended)

### Step 1: Amount Entry
- Keypad with quick chips ($5, $10, $20, or recent amounts).
- Primary action button: **"Scan Face to Pay [Amount]"** (e.g., *"Scan Face to Pay $6.80"*).
- Merchant taps once -> terminal immediately transitions to the scanner.

### Step 2: Scan & Auto-Pay
- Camera opens instantly facing the customer.
- **Prominent on-screen amount banner**:
  - Top header clearly shows the charge: `Paying $6.80 at Kissa Coffee`.
  - Subtitle: `Look at camera to authorize payment`.
- Customer looks at the camera.
- **Instant Match & Auto-Charge**:
  - Biometric reticle locks green: `✓ Zia S. · 99.8% match`.
  - A subtle 900ms visual lock-in ring animates around the customer badge.
  - A clear **"Cancel"** button is visible throughout if the wrong customer is in view or if they wish to abort.
  - As soon as the 900ms lock-in completes, payment automatically authorizes!
- **Result**:
  - Green screen flash + animated **PAID** stamp + haptic vibrate + chime.
  - "New sale" ready immediately.

**Performance**:
- Total merchant taps: **1** (or 0 if repeating last sale from Home).
- Total customer taps: **0** (simply look at the camera).
- Total transaction time: **~2 to 3 seconds**.

---

## 3. Alternative 3-Step Flow (Merchant Preference)
For merchants who prefer a final verification tap before funds are transferred:
- **Step 1**: Enter amount -> tap "Scan Face to Pay".
- **Step 2**: Camera opens with amount banner -> customer looks at camera -> matches.
- **Step 3**: Single-tap confirmation sheet: `Matched Zia S. (99.8%)` -> Tap **"Charge $6.80"** (with "Rescan" option).

### Merchant Setting: "Express Auto-Charge"
Under **Account → Preferences & Staff PIN**:
- Toggle: **`Express face pay`** (Default: `ON`)
  - Description: *"Automatically charge as soon as customer's face is verified, without a second confirmation tap."*
  - When ON: 2-step flow.
  - When OFF: 3-step flow.

---

## 4. Technical Implementation Details

### 4.1 State Machine Refactor (`src/features/merchant/checkout/checkoutMachine.ts`)
- Remove `customer_review` from the mandatory path.
- In `draft`, `SUBMIT_AMOUNT` transitions directly to `camera_permission` (or `capturing`).
- Add an `AUTO_AUTH` event triggered when `expressMode` is enabled and `MATCH_OK` has resolved.
- Maintain full compatibility with `RETRY_SCAN`, `CANCEL`, and existing failure codes (`insufficient_funds`, `no_match`, `offline`, etc.).

### 4.2 Checkout Screen (`src/features/merchant/checkout/Checkout.tsx`)
- In `draft`: Primary button displays dynamic amount label: `"Scan Face to Pay " + amountText`.
- In `camera_permission` / `capturing` / `matching`:
  - Render an on-screen customer charge header directly above/inside the camera box:
    ```tsx
    <div className="scanner-amount-banner">
      <p className="eyebrow">Paying {merchantName}</p>
      <h2>{amountText}</h2>
    </div>
    ```
- When face matches (`s.name === "matched"`):
  - In Express mode: display match card with a 900ms progress ring and "Cancel" option, automatically invoking `dispatch({ type: "CONFIRM" })` upon timer completion.
  - In Manual mode: display the single-tap "Charge {amountText}" button.

### 4.3 Preferences & Settings (`src/app/prefs.ts` & `src/features/account/Account.tsx`)
- Extend `Prefs` interface:
  ```ts
  export interface Prefs {
    sound: boolean;
    haptics: boolean;
    motion: boolean;
    pin: string;
    expressCheckout: boolean; // default: true
  }
  ```
- Add toggle in Merchant Account preferences sheet.

### 4.4 Styles (`src/styles/globals.css`)
- `.scanner-amount-banner`: Clean retro styling with cream text and Righteous font amount display.
- `.auto-charge-ring`: Smooth SVG countdown circle for the 900ms confirmation window.

---

## 5. Failure & Edge Cases
1. **Wrong Customer Matched**:
   - The customer's name and photo initials are displayed in green with a prominent "Not you? Cancel" button during the 900ms lock-in. Tapping cancel instantly stops the charge and returns to draft.
2. **Insufficient Funds / Multiple Payment Methods**:
   - The fallback logic across customer's payment order (Wallet -> Bank -> Card) continues to operate automatically. If all fail, routes cleanly to the failure screen with "Change amount".
3. **Offline during Scan**:
   - Offline detection banner blocks scanning before any attempt is made.

---

## 6. Verification Strategy
- **Automated**: `tsc --noEmit` and `pnpm build` compile with zero errors.
- **Manual Checklist**:
  1. Default flow (Express ON): Enter amount -> Tap "Scan Face to Pay" -> Camera opens with amount banner -> Face locks green -> Auto-charges to PAID receipt screen with zero extra taps.
  2. Manual mode (Express OFF): Enter amount -> Scan face -> Tap "Charge" once -> PAID screen.
  3. Cancel safety: Tap "Cancel" during the 900ms match lock-in -> Sale is cleanly cancelled with zero charge.
  4. Repeat Last Amount from Merchant Home: Opens directly into the 2-step scan flow.
