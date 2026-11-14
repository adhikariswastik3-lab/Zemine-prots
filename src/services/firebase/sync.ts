import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./config";
import { updateDb } from "../mock/db";
import type { CustomerProfile, MerchantProfile, User } from "@/domain/types";

let initialized = false;

/**
 * Attaches real-time Firestore listeners to the logged-in Firebase user
 * and synchronizes their live customer/merchant balance, sources, and transactions
 * straight into the app's reactive store (`useSession`).
 */
export function initFirebaseSync() {
  if (initialized) return;
  initialized = true;

  let unsubscribeDoc: (() => void) | null = null;

  onAuthStateChanged(auth, (user) => {
    if (unsubscribeDoc) {
      unsubscribeDoc();
      unsubscribeDoc = null;
    }

    if (!user) {
      updateDb((draft) => {
        draft.user = null;
      });
      return;
    }

    // 1. Fetch User Record
    const userRef = doc(db, "users", user.uid);
    unsubscribeDoc = onSnapshot(userRef, (userSnap) => {
      if (!userSnap.exists()) return;
      const userData = userSnap.data() as User;

      updateDb((draft) => {
        draft.user = {
          ...userData,
          id: user.uid,
          name: userData.name || user.displayName || "User",
          contact: userData.contact || user.email || "",
        };
      });

      // 2. Fetch Customer or Merchant collection with real-time balance
      if (userData.role === "customer") {
        const custRef = doc(db, "customers", user.uid);
        onSnapshot(custRef, (custSnap) => {
          if (!custSnap.exists()) return;
          const custData = custSnap.data() as any;

          updateDb((draft) => {
            if (custData.balanceMinor !== undefined) {
              draft.customer.balanceMinor = custData.balanceMinor;
            }
            if (custData.sources) {
              draft.customer.sources = custData.sources;
            }
            if (custData.transactions) {
              draft.customer.transactions = custData.transactions;
            }
            if (custData.limitPerTxMinor !== undefined) {
              draft.customer.limitPerTxMinor = custData.limitPerTxMinor;
            }
            if (custData.enrollment) {
              draft.customer.enrollment = custData.enrollment;
            }
            if (custData.name) {
              draft.customer.name = custData.name;
            }
          });
        });
      } else if (userData.role === "merchant") {
        const merchRef = doc(db, "merchants", user.uid);
        onSnapshot(merchRef, (merchSnap) => {
          if (!merchSnap.exists()) return;
          const merchData = merchSnap.data() as any;

          updateDb((draft) => {
            if (merchData.businessName) {
              draft.merchant.businessName = merchData.businessName;
            }
            if (merchData.transactions) {
              draft.merchant.transactions = merchData.transactions;
            }
            if (merchData.settlements) {
              draft.merchant.settlements = merchData.settlements;
            }
          });
        });
      }
    });
  });
}
