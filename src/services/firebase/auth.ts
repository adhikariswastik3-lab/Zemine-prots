import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./config";
import type { AuthService, SignUpInput } from "../contracts";
import type { Role, User } from "@/domain/types";
import { ServiceError } from "@/domain/types";
import { updateDb } from "../mock/db";

// In-memory challenge store for 2-step code verification simulation
const challenges = new Map<string, { role: Role; contact: string; password?: string; input?: SignUpInput }>();

export const firebaseAuth: AuthService = {
  async signIn({ role, contact, password }) {
    try {
      // Validate credentials against Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, contact, password);
      const uid = userCredential.user.uid;

      // Verify that user matches requested role
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.role !== role) {
          throw new ServiceError("no_account", `This account is registered as a ${data.role}, not a ${role}.`);
        }
      }

      const challengeId = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      challenges.set(challengeId, { role, contact });
      return { challengeId };
    } catch (err: any) {
      if (err instanceof ServiceError) throw err;
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        throw new ServiceError("invalid_credentials", "Incorrect email or password.");
      }
      throw new ServiceError("unknown", err.message || "Failed to sign in.");
    }
  },

  async signUp(input) {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, input.contact, input.password);
      const uid = userCredential.user.uid;

      await updateProfile(userCredential.user, { displayName: input.name });

      // Save user profile & initial wallet in Firestore
      const userRecord: User = {
        id: uid,
        role: input.role,
        name: input.name,
        contact: input.contact,
        businessName: input.businessName,
        marketId: input.marketId,
      };

      await setDoc(doc(db, "users", uid), userRecord);

      // Initialize customer or merchant profile in Firestore
      if (input.role === "customer") {
        await setDoc(doc(db, "customers", uid), {
          balanceMinor: 0,
          name: input.name,
          enrollment: { status: "none" },
          limitPerTxMinor: 25000,
          paymentOrder: ["wallet"],
          sources: [],
          transactions: [],
          notifications: { payments: true, security: true, marketing: false },
        });
      } else {
        await setDoc(doc(db, "merchants", uid), {
          businessName: input.businessName || input.name,
          transactions: [],
          settlements: [],
          settlementAccount: input.settlementAccount || "",
          deviceBound: !!input.deviceBound,
        });
      }

      const challengeId = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      challenges.set(challengeId, { role: input.role, contact: input.contact, input });
      return { challengeId };
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        throw new ServiceError("invalid_credentials", "An account with that email already exists.");
      }
      throw new ServiceError("unknown", err.message || "Failed to sign up.");
    }
  },

  async verifyCode(challengeId, code) {
    const challenge = challenges.get(challengeId);
    if (!challenge) {
      throw new ServiceError("unknown", "Verification session expired. Please sign in again.");
    }
    // Accept standard demo OTP 424242 or any 6-digit code for testing
    if (code !== "424242" && code.length !== 6) {
      throw new ServiceError("wrong_code", "Invalid verification code.");
    }

    challenges.delete(challengeId);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new ServiceError("unknown", "No active session found.");
    }

    let user: User;
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists()) {
      user = userDoc.data() as User;
    } else {
      user = {
        id: currentUser.uid,
        role: challenge.role,
        name: currentUser.displayName || "User",
        contact: challenge.contact,
        marketId: "pilot-usd",
      };
    }

    // Sync user state into reactive app session store so route guards let the user in
    updateDb((dbState) => {
      dbState.user = user;
      if (user.role === "customer") {
        dbState.customer.name = user.name;
      } else {
        dbState.merchant.businessName = user.businessName || user.name;
      }
    });

    return user;
  },

  async resendCode() {
    // Simulated SMS/Email resend
  },

  async requestReset(contact: string) {
    // Can call sendPasswordResetEmail(auth, contact)
  },

  signOut() {
    fbSignOut(auth).catch(() => {});
    updateDb((dbState) => {
      dbState.user = null;
    });
  },
};
