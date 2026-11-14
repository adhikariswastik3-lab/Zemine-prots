import { firebaseAuth } from "./auth";
import { firebaseWallet } from "./wallet";
import { firebaseBiometric } from "./biometric";
import { initFirebaseSync } from "./sync";
import { mockPayments } from "../mock/payments";
import { mockAuth } from "../mock/auth";
import { mockWallet } from "../mock/wallet";
import { mockBiometric } from "../mock/biometric";

// Set to true once you paste your Firebase keys in .env
const USE_FIREBASE = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== "YOUR_API_KEY"
);

if (USE_FIREBASE) {
  initFirebaseSync();
}

export const services = {
  auth: USE_FIREBASE ? firebaseAuth : mockAuth,
  wallet: USE_FIREBASE ? firebaseWallet : mockWallet,
  biometric: USE_FIREBASE ? firebaseBiometric : mockBiometric,
  payments: mockPayments,
};
