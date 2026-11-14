import { getMarket } from "@/config/markets";
import { resolveOrder, WALLET_ID, type PayMethod } from "@/domain/payment";
import { ServiceError, type Receipt } from "@/domain/types";
import type { PaymentService } from "../contracts";
import { getDb, newId, newReference, updateDb } from "./db";
import { consumeScenario, getScenario, wait } from "./scenario";

function assertOnline() {
  if (getScenario() === "offline") throw new ServiceError("offline", "No connection. The payment was not sent.");
}

function commit(key: string, amountMinor: number, method: PayMethod, fellBackFrom: string[]): Receipt {
  const db = getDb();
  const at = new Date().toISOString();
  const receipt: Receipt = {
    id: newId("rcpt"),
    reference: newReference(),
    amountMinor,
    at,
    customerName: db.customer.name,
    merchantName: db.merchant.businessName,
    method: method.kind === "wallet" ? method.label : `${method.label} ${method.detail}`,
    fellBackFrom: fellBackFrom.length ? fellBackFrom : undefined,
  };
  const short = `${db.customer.name.split(" ")[0]} ${db.customer.name.split(" ")[1]?.[0] ?? ""}.`.trim();
  updateDb((d) => {
    if (method.id === WALLET_ID) d.customer.balanceMinor -= amountMinor;
    d.customer.transactions.unshift({ id: newId("tx"), kind: "face_payment", title: receipt.merchantName, counterparty: receipt.merchantName, amountMinor: -amountMinor, at, reference: receipt.reference, via: receipt.method });
    d.merchant.transactions.unshift({ id: newId("tx"), kind: "face_payment", title: "Face payment", counterparty: short, amountMinor, at, reference: receipt.reference });
    d.receipts[key] = receipt;
  });
  return receipt;
}

export const mockPayments: PaymentService = {
  async authorize({ amountMinor, idempotencyKey }) {
    await wait(350);
    assertOnline();
    const existing = getDb().receipts[idempotencyKey];
    if (existing) return existing;
    if (consumeScenario("authorization_failed")) throw new ServiceError("authorization_failed", "The payment was declined.");
    const { customer, marketId } = getDb();
    const market = getMarket(marketId);
    if (amountMinor > Math.min(customer.limitPerTxMinor, market.limits.perTransactionMinor)) {
      throw new ServiceError("limit_exceeded", "This amount is above the customer's per-payment limit.");
    }
    // Try the customer's payment methods in their chosen order until one works.
    const order = resolveOrder(customer.paymentOrder, customer.sources);
    const forceFirstFail = consumeScenario("insufficient_funds");
    const failed: string[] = [];
    let chosen: PayMethod | null = null;
    for (const [i, method] of order.entries()) {
      await wait(i === 0 ? 0 : 300);
      const declined = (i === 0 && forceFirstFail) || (method.id === WALLET_ID && amountMinor > customer.balanceMinor);
      if (declined) failed.push(method.label);
      else {
        chosen = method;
        break;
      }
    }
    if (!chosen) throw new ServiceError("insufficient_funds", order.length ? "None of the customer's payment methods could cover this payment." : "The customer has no payment method set up.");
    const receipt = commit(idempotencyKey, amountMinor, chosen, failed);
    if (consumeScenario("duplicate")) throw new ServiceError("duplicate_detected", "This payment was already completed.");
    if (consumeScenario("unknown_result")) throw new ServiceError("unknown_result", "The result did not come back in time.");
    return receipt;
  },

  async lookup(idempotencyKey) {
    await wait(500);
    assertOnline();
    return getDb().receipts[idempotencyKey] ?? null;
  },

  async report(transactionId) {
    await wait(350);
    assertOnline();
    updateDb((d) => {
      const target = d.customer.transactions.find((t) => t.id === transactionId);
      if (target) target.reported = true;
    });
  },

  async refund(transactionId) {
    await wait(500);
    assertOnline();
    const tx = getDb().merchant.transactions.find((t) => t.id === transactionId);
    if (!tx || tx.refunded || tx.amountMinor <= 0) throw new ServiceError("unknown", "This sale cannot be refunded.");
    const at = new Date().toISOString();
    updateDb((d) => {
      const target = d.merchant.transactions.find((t) => t.id === transactionId)!;
      target.refunded = true;
      d.merchant.transactions.unshift({ id: newId("tx"), kind: "refund", title: "Refund", counterparty: target.counterparty, amountMinor: -target.amountMinor, at, reference: newReference() });
      d.customer.balanceMinor += target.amountMinor;
      d.customer.transactions.unshift({ id: newId("tx"), kind: "refund", title: `Refund · ${d.merchant.businessName}`, counterparty: d.merchant.businessName, amountMinor: target.amountMinor, at, reference: newReference() });
    });
  },
};
