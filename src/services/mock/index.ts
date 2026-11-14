import { mockAuth } from "./auth";
import { mockBiometric } from "./biometric";
import { mockPayments } from "./payments";
import { mockWallet } from "./wallet";

export const services = {
  auth: mockAuth,
  biometric: mockBiometric,
  payments: mockPayments,
  wallet: mockWallet,
};
