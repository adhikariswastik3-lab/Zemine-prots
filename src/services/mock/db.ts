import { useSyncExternalStore } from "react";
import { defaultMarketId, getMarket } from "@/config/markets";
import type {
  Enrollment,
  FundingSource,
  Receipt,
  Settlement,
  Transaction,
  User,
} from "@/domain/types";

export interface Db {
  marketId: string;
  user: User | null;
  contacts: { role: string; contact: string; name: string; businessName?: string }[];
  customer: {
    balanceMinor: number;
    enrollment: Enrollment;
    limitPerTxMinor: number;
    paymentOrder?: string[];
    sources: FundingSource[];
    transactions: Transaction[];
    name: string;
    notifications: { payments: boolean; security: boolean; marketing: boolean };
  };
  merchant: {
    businessName: string;
    transactions: Transaction[];
    settlements: Settlement[];
    team: { name: string; role: string; canRefund: boolean }[];
  };
  receipts: Record<string, Receipt>;
}

const STORAGE_KEY = "zemine.db.v1";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const daysAgo = (d: number, h = 0) => hoursAgo(d * 24 + h);
export const newId = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
export const newReference = () => `ZMN-${Math.floor(100000 + Math.random() * 899999)}`;

function seed(marketId: string, withDemoData: boolean): Db {
  const m = getMarket(marketId);
  const amt = (v: number) => Math.round(v * 10 ** m.minorUnits);
  const tx = (
    kind: Transaction["kind"],
    title: string,
    counterparty: string,
    value: number,
    at: string,
  ): Transaction => ({ id: newId("tx"), kind, title, counterparty, amountMinor: amt(value), at, reference: newReference() });

  return {
    marketId,
    user: null,
    contacts: [],
    customer: {
      name: "Zia Shah",
      balanceMinor: withDemoData ? amt(248.6) : 0,
      enrollment: withDemoData
        ? { status: "active", consentVersion: "2026-10-v1", consentAt: daysAgo(9), enrolledAt: daysAgo(9) }
        : { status: "none" },
      limitPerTxMinor: m.limits.perTransactionMinor,
      paymentOrder: withDemoData ? ["wallet", "src_bank", "src_card"] : ["wallet"],
      sources: withDemoData
        ? [
            { id: "src_bank", label: "Mizu Bank", kind: "bank", last4: "1284", primary: true },
            { id: "src_card", label: "Visa", kind: "card", last4: "9041", primary: false },
          ]
        : [],
      transactions: withDemoData
        ? [
            tx("face_payment", "Kissa Coffee", "Kissa Coffee", -6.8, hoursAgo(3)),
            tx("face_payment", "Metro Mart", "Metro Mart", -21.4, daysAgo(1, 2)),
            tx("topup", "Balance top-up", "Mizu Bank", 100, daysAgo(4)),
            tx("face_payment", "Hanabi Noodles", "Hanabi Noodles", -14.2, daysAgo(6)),
          ]
        : [],
      notifications: { payments: true, security: true, marketing: false },
    },
    merchant: {
      businessName: "Kissa Coffee",
      transactions: withDemoData
        ? [
            tx("face_payment", "Face payment", "Zia S.", 6.8, hoursAgo(1)),
            tx("face_payment", "Face payment", "Lina K.", 12.2, hoursAgo(1.2)),
            tx("qr_payment", "QR payment", "Walk-in", 5.4, hoursAgo(1.5)),
            tx("face_payment", "Face payment", "Omar B.", 9.9, hoursAgo(5)),
            tx("face_payment", "Face payment", "Priya N.", 18.5, daysAgo(1)),
          ]
        : [],
      settlements: [
        { id: newId("st"), date: daysAgo(1), amountMinor: amt(846.2), status: "paid", reference: newReference() },
        { id: newId("st"), date: daysAgo(2), amountMinor: amt(712.8), status: "paid", reference: newReference() },
        { id: newId("st"), date: hoursAgo(0), amountMinor: amt(52.8), status: "pending", reference: newReference() },
      ],
      team: [
        { name: "You (owner)", role: "Owner", canRefund: true },
        { name: "Amara T.", role: "Cashier", canRefund: false },
      ],
    },
    receipts: {},
  };
}

function load(): Db {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    /* fall through to seed */
  }
  return seed(defaultMarketId, true);
}

let state: Db = load();
const listeners = new Set<() => void>();

export const getDb = () => state;

export function updateDb(fn: (draft: Db) => Db | void) {
  const next = structuredClone(state);
  state = fn(next) ?? next;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

export function resetDb(marketId: string, withDemoData: boolean) {
  const keep = { contacts: state.contacts, user: state.user };
  updateDb(() => ({ ...seed(marketId, withDemoData), ...keep }));
}

export function useDb(): Db {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}
