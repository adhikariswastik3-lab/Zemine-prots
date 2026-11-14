import type {
  Enrollment,
  FundingSource,
  MatchedCustomer,
  Receipt,
  Role,
  Settlement,
  Transaction,
  User,
} from "@/domain/types";

export interface SignUpInput {
  role: Role;
  name: string;
  contact: string;
  password: string;
  marketId: string;
  businessName?: string;
  settlementAccount?: string;
  deviceBound?: boolean;
}

export interface AuthService {
  signIn(input: { role: Role; contact: string; password: string }): Promise<{ challengeId: string }>;
  signUp(input: SignUpInput): Promise<{ challengeId: string }>;
  verifyCode(challengeId: string, code: string): Promise<User>;
  resendCode(challengeId: string): Promise<void>;
  requestReset(contact: string): Promise<void>;
  signOut(): void;
}

export interface BiometricProvider {
  checkFraming(): Promise<void>;
  checkLiveness(): Promise<void>;
  enroll(input: { consentVersion: string }): Promise<Enrollment>;
  setStatus(status: "active" | "suspended" | "revoked"): void;
  match(): Promise<MatchedCustomer>;
}

export interface PaymentService {
  authorize(input: { customerId: string; amountMinor: number; idempotencyKey: string }): Promise<Receipt>;
  lookup(idempotencyKey: string): Promise<Receipt | null>;
  refund(transactionId: string): Promise<void>;
  report(transactionId: string): Promise<void>;
}

export interface WalletService {
  topUp(input: { amountMinor: number; sourceId: string }): Promise<void>;
  addSource(input: { label: string; kind: "bank" | "card"; last4: string }): void;
  removeSource(id: string): void;
  setPrimarySource(id: string): void;
  setPaymentOrder(ids: string[]): void;
  setLimit(perTransactionMinor: number): void;
  updateBusiness(input: { businessName: string }): void;
  list(): { transactions: Transaction[]; sources: FundingSource[]; settlements: Settlement[] };
}
