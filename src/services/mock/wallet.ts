import { ServiceError } from "@/domain/types";
import type { WalletService } from "../contracts";
import { getDb, newId, newReference, updateDb } from "./db";
import { getScenario, wait } from "./scenario";

export const mockWallet: WalletService = {
  async topUp({ amountMinor, sourceId }) {
    await wait(500);
    if (getScenario() === "offline") throw new ServiceError("offline", "No connection. You were not charged.");
    const source = getDb().customer.sources.find((s) => s.id === sourceId);
    if (!source) throw new ServiceError("unknown", "Choose a funding source first.");
    updateDb((d) => {
      d.customer.balanceMinor += amountMinor;
      d.customer.transactions.unshift({ id: newId("tx"), kind: "topup", title: "Balance top-up", counterparty: `${source.label} ·· ${source.last4}`, amountMinor, at: new Date().toISOString(), reference: newReference() });
    });
  },

  addSource({ label, kind, last4 }) {
    updateDb((d) => {
      const id = newId("src");
      d.customer.sources.push({ id, label, kind, last4, primary: d.customer.sources.length === 0 });
      const order = d.customer.paymentOrder ?? ["wallet", ...d.customer.sources.slice(0, -1).map((s) => s.id)];
      if (order.length < 3) order.push(id);
      d.customer.paymentOrder = order;
    });
  },

  removeSource(id) {
    updateDb((d) => {
      const wasPrimary = d.customer.sources.find((s) => s.id === id)?.primary;
      d.customer.sources = d.customer.sources.filter((s) => s.id !== id);
      d.customer.paymentOrder = d.customer.paymentOrder?.filter((x) => x !== id);
      if (wasPrimary && d.customer.sources[0]) d.customer.sources[0].primary = true;
    });
  },

  setPrimarySource(id) {
    updateDb((d) => {
      d.customer.sources.forEach((s) => (s.primary = s.id === id));
      const rest = (d.customer.paymentOrder ?? ["wallet"]).filter((x) => x !== id);
      d.customer.paymentOrder = [id, ...rest].slice(0, 3);
    });
  },

  setPaymentOrder(ids) {
    updateDb((d) => {
      d.customer.paymentOrder = ids.slice(0, 3);
    });
  },

  setLimit(perTransactionMinor) {
    updateDb((d) => {
      d.customer.limitPerTxMinor = perTransactionMinor;
    });
  },

  updateBusiness({ businessName }) {
    updateDb((d) => {
      d.merchant.businessName = businessName;
      if (d.user?.role === "merchant") d.user.businessName = businessName;
    });
  },

  list() {
    const { customer, merchant } = getDb();
    return { transactions: customer.transactions, sources: customer.sources, settlements: merchant.settlements };
  },
};
