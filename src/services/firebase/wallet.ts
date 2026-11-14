import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  increment,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "./config";
import type { WalletService } from "../contracts";
import type { FundingSource, Settlement, Transaction } from "@/domain/types";
import { ServiceError } from "@/domain/types";

const newId = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const newReference = () => `ZMN-${Math.floor(100000 + Math.random() * 899999)}`;

export const firebaseWallet: WalletService = {
  async topUp({ amountMinor, sourceId }) {
    const user = auth.currentUser;
    if (!user) throw new ServiceError("no_account", "Please sign in to add funds.");

    const customerRef = doc(db, "customers", user.uid);
    const snap = await getDoc(customerRef);
    if (!snap.exists()) throw new ServiceError("no_account", "Customer profile not found.");

    const data = snap.data();
    const source = (data.sources || []).find((s: FundingSource) => s.id === sourceId);
    const label = source ? source.label : "Linked source";

    const newTx: Transaction = {
      id: newId("tx"),
      kind: "topup",
      title: "Balance top-up",
      counterparty: label,
      amountMinor,
      at: new Date().toISOString(),
      reference: newReference(),
    };

    await updateDoc(customerRef, {
      balanceMinor: increment(amountMinor),
      transactions: arrayUnion(newTx),
    });
  },

  async addSource({ label, kind, last4 }) {
    const user = auth.currentUser;
    if (!user) return;

    const customerRef = doc(db, "customers", user.uid);
    const snap = await getDoc(customerRef);
    if (!snap.exists()) return;

    const currentSources: FundingSource[] = snap.data().sources || [];
    const isFirst = currentSources.length === 0;
    const newSrc: FundingSource = {
      id: newId("src"),
      label,
      kind,
      last4,
      primary: isFirst,
    };

    await updateDoc(customerRef, {
      sources: arrayUnion(newSrc),
      paymentOrder: arrayUnion(newSrc.id),
    });
  },

  async removeSource(id) {
    const user = auth.currentUser;
    if (!user) return;

    const customerRef = doc(db, "customers", user.uid);
    const snap = await getDoc(customerRef);
    if (!snap.exists()) return;

    const currentSources: FundingSource[] = snap.data().sources || [];
    const updated = currentSources.filter((s) => s.id !== id);
    if (updated.length && !updated.some((s) => s.primary)) {
      updated[0].primary = true;
    }

    const currentOrder: string[] = snap.data().paymentOrder || ["wallet"];
    const updatedOrder = currentOrder.filter((x) => x !== id);

    await updateDoc(customerRef, {
      sources: updated,
      paymentOrder: updatedOrder,
    });
  },

  async setPrimarySource(id) {
    const user = auth.currentUser;
    if (!user) return;

    const customerRef = doc(db, "customers", user.uid);
    const snap = await getDoc(customerRef);
    if (!snap.exists()) return;

    const currentSources: FundingSource[] = snap.data().sources || [];
    const updated = currentSources.map((s) => ({ ...s, primary: s.id === id }));
    const currentOrder: string[] = snap.data().paymentOrder || ["wallet"];
    const updatedOrder = [id, ...currentOrder.filter((x) => x !== id)];

    await updateDoc(customerRef, {
      sources: updated,
      paymentOrder: updatedOrder,
    });
  },

  async setPaymentOrder(ids) {
    const user = auth.currentUser;
    if (!user) return;

    const customerRef = doc(db, "customers", user.uid);
    await updateDoc(customerRef, { paymentOrder: ids.slice(0, 3) });
  },

  async setLimit(perTransactionMinor) {
    const user = auth.currentUser;
    if (!user) return;

    const customerRef = doc(db, "customers", user.uid);
    await updateDoc(customerRef, { limitPerTxMinor: perTransactionMinor });
  },

  async updateBusiness({ businessName }) {
    const user = auth.currentUser;
    if (!user) return;

    const merchantRef = doc(db, "merchants", user.uid);
    await updateDoc(merchantRef, { businessName });
  },

  list() {
    return { transactions: [], sources: [], settlements: [] };
  },
};
