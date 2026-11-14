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
    let snap = await getDoc(customerRef);
    
    // Auto-create customer document if user signed in without initial document
    if (!snap.exists()) {
      const initialDoc = {
        balanceMinor: 0,
        name: user.displayName || "Customer",
        enrollment: { status: "none" },
        limitPerTxMinor: 25000,
        paymentOrder: ["wallet"],
        sources: [
          { id: "src_default", label: "Primary Account", kind: "bank", last4: "4242", primary: true }
        ],
        transactions: [],
        notifications: { payments: true, security: true, marketing: false },
      };
      await setDoc(customerRef, initialDoc);
      snap = await getDoc(customerRef);
    }

    const data = snap.data() || {};
    const sources: FundingSource[] = data.sources || [];
    const source = sources.find((s) => s.id === sourceId) || sources[0];
    const label = source ? source.label : "Linked Account";

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
    const currentSources: FundingSource[] = snap.exists() ? (snap.data().sources || []) : [];
    const isFirst = currentSources.length === 0;
    const newSrc: FundingSource = {
      id: newId("src"),
      label,
      kind,
      last4,
      primary: isFirst,
    };

    if (!snap.exists()) {
      await setDoc(customerRef, {
        balanceMinor: 0,
        name: user.displayName || "Customer",
        enrollment: { status: "none" },
        limitPerTxMinor: 25000,
        paymentOrder: [newSrc.id],
        sources: [newSrc],
        transactions: [],
        notifications: { payments: true, security: true, marketing: false },
      });
    } else {
      await updateDoc(customerRef, {
        sources: arrayUnion(newSrc),
        paymentOrder: arrayUnion(newSrc.id),
      });
    }
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
