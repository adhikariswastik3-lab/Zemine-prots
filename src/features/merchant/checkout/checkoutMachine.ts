import type { MatchedCustomer, Receipt } from "@/domain/types";

export type FailureName =
  | "camera_denied"
  | "no_match"
  | "multiple_faces"
  | "liveness_failed"
  | "offline"
  | "insufficient_funds"
  | "limit_exceeded"
  | "authorization_failed"
  | "duplicate_detected"
  | "unknown_result";

export type CheckoutName =
  | "draft"
  | "customer_review"
  | "camera_permission"
  | "capturing"
  | "matching"
  | "matched"
  | "authorizing"
  | "succeeded"
  | "cancelled"
  | FailureName;

export interface CheckoutState {
  name: CheckoutName;
  digits: string;
  idempotencyKey: string;
  customer?: MatchedCustomer;
  receipt?: Receipt;
  message?: string;
  offlineFrom?: "matching" | "authorizing";
}

export type CheckoutEvent =
  | { type: "DIGIT"; digit: string }
  | { type: "BACKSPACE" }
  | { type: "SET_DIGITS"; digits: string }
  | { type: "SUBMIT_AMOUNT"; key: string }
  | { type: "CUSTOMER_APPROVE" }
  | { type: "CUSTOMER_DECLINE" }
  | { type: "CAMERA_OK" }
  | { type: "CAMERA_DENIED" }
  | { type: "CAPTURED" }
  | { type: "MATCH_OK"; customer: MatchedCustomer }
  | { type: "FAIL"; code: string; message?: string }
  | { type: "CONFIRM" }
  | { type: "AUTH_OK"; receipt: Receipt }
  | { type: "RESOLVED"; receipt: Receipt }
  | { type: "NOT_FOUND" }
  | { type: "RETRY_SCAN" }
  | { type: "RETRY_AUTH" }
  | { type: "EDIT_AMOUNT" }
  | { type: "CANCEL" }
  | { type: "RESET" };

export const MAX_DIGITS = 9;

export const initialCheckoutState: CheckoutState = { name: "draft", digits: "", idempotencyKey: "" };

let prefill = "";
/** Lets other screens (e.g. "Repeat last amount") open checkout with an amount already entered. */
export const setCheckoutPrefill = (minor: number) => { prefill = String(minor); };
export function initCheckout(base: CheckoutState): CheckoutState {
  const digits = prefill.slice(0, MAX_DIGITS);
  prefill = "";
  return digits ? { ...base, digits } : base;
}

const matchFailures: FailureName[] = ["no_match", "multiple_faces", "liveness_failed", "offline"];
const authFailures: FailureName[] = ["insufficient_funds", "limit_exceeded", "authorization_failed", "duplicate_detected", "unknown_result", "offline"];

export function checkoutReducer(s: CheckoutState, e: CheckoutEvent): CheckoutState {
  switch (e.type) {
    case "DIGIT":
      if (s.name !== "draft") return s;
      return { ...s, digits: (s.digits + e.digit).replace(/^0+/, "").slice(0, MAX_DIGITS) };
    case "SET_DIGITS":
      return s.name === "draft" ? { ...s, digits: e.digits.slice(0, MAX_DIGITS) } : s;
    case "BACKSPACE":
      return s.name === "draft" ? { ...s, digits: s.digits.slice(0, -1) } : s;
    case "SUBMIT_AMOUNT":
      return s.name === "draft" && s.digits ? { ...s, name: "camera_permission", idempotencyKey: e.key } : s;
    case "CUSTOMER_APPROVE":
      return s.name === "customer_review" ? { ...s, name: "camera_permission" } : s;
    case "CUSTOMER_DECLINE":
      return s.name === "customer_review" ? { ...s, name: "cancelled", message: "The customer declined the amount." } : s;
    case "CAMERA_OK":
      return s.name === "camera_permission" ? { ...s, name: "capturing" } : s;
    case "CAMERA_DENIED":
      return s.name === "camera_permission" || s.name === "capturing" ? { ...s, name: "camera_denied" } : s;
    case "CAPTURED":
      return s.name === "capturing" ? { ...s, name: "matching" } : s;
    case "MATCH_OK":
      return s.name === "matching" ? { ...s, name: "matched", customer: e.customer } : s;
    case "CONFIRM":
      return s.name === "matched" ? { ...s, name: "authorizing" } : s;
    case "AUTH_OK":
    case "RESOLVED":
      return s.name === "authorizing" || s.name === "unknown_result" || s.name === "duplicate_detected" || s.name === "offline"
        ? { ...s, name: "succeeded", receipt: e.receipt, message: undefined }
        : s;
    case "NOT_FOUND":
      return s.name === "unknown_result" || s.name === "duplicate_detected" || s.name === "offline"
        ? { ...s, name: "authorization_failed", message: "No payment was recorded, so you can safely try again." }
        : s;
    case "FAIL": {
      if (s.name === "matching" && matchFailures.includes(e.code as FailureName)) {
        return { ...s, name: e.code as FailureName, message: e.message, offlineFrom: "matching" };
      }
      if (s.name === "authorizing" && authFailures.includes(e.code as FailureName)) {
        return { ...s, name: e.code as FailureName, message: e.message, offlineFrom: "authorizing" };
      }
      if (s.name === "matching") return { ...s, name: "no_match", message: e.message };
      if (s.name === "authorizing") return { ...s, name: "authorization_failed", message: e.message };
      return s;
    }
    case "RETRY_SCAN":
      return { ...s, name: "camera_permission", customer: undefined, message: undefined };
    case "RETRY_AUTH":
      return { ...s, name: "authorizing", message: undefined };
    case "EDIT_AMOUNT":
      return { ...s, name: "draft", customer: undefined, message: undefined, idempotencyKey: "" };
    case "CANCEL":
      return s.name === "authorizing" || s.name === "unknown_result" || s.name === "succeeded"
        ? s
        : { ...s, name: "cancelled", message: "No charge was made." };
    case "RESET":
      return initialCheckoutState;
  }
}
