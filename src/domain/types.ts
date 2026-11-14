export type Role = "customer" | "merchant";

export interface User {
  id: string;
  role: Role;
  name: string;
  contact: string;
  businessName?: string;
  marketId: string;
}

export type EnrollmentStatus = "none" | "active" | "suspended" | "revoked";

export interface Enrollment {
  status: EnrollmentStatus;
  consentVersion?: string;
  consentAt?: string;
  enrolledAt?: string;
}

export type TxKind = "face_payment" | "topup" | "refund" | "qr_payment";

export interface Transaction {
  id: string;
  kind: TxKind;
  title: string;
  counterparty: string;
  amountMinor: number;
  at: string;
  refunded?: boolean;
  reported?: boolean;
  via?: string;
  reference: string;
}

export interface FundingSource {
  id: string;
  label: string;
  kind: "bank" | "card";
  last4: string;
  primary: boolean;
}

export interface Settlement {
  id: string;
  date: string;
  amountMinor: number;
  status: "paid" | "pending";
  reference: string;
}

export interface Receipt {
  id: string;
  reference: string;
  amountMinor: number;
  at: string;
  customerName: string;
  merchantName: string;
  method?: string;
  fellBackFrom?: string[];
}

export interface MatchedCustomer {
  id: string;
  displayName: string;
  initials: string;
  confidence: number;
}

export type ServiceErrorCode =
  | "offline"
  | "locked"
  | "wrong_code"
  | "no_account"
  | "invalid_credentials"
  | "camera_denied"
  | "low_light"
  | "liveness_failed"
  | "duplicate"
  | "no_match"
  | "multiple_faces"
  | "insufficient_funds"
  | "limit_exceeded"
  | "authorization_failed"
  | "unknown_result"
  | "duplicate_detected"
  | "unknown";

export class ServiceError extends Error {
  code: ServiceErrorCode;
  constructor(code: ServiceErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}
