import { demoCode, demoPassword } from "@/config/markets";
import { ServiceError, type Role, type User } from "@/domain/types";
import type { AuthService, SignUpInput } from "../contracts";
import { getDb, newId, resetDb, updateDb } from "./db";
import { consumeScenario, getScenario, wait } from "./scenario";

type Challenge =
  | { kind: "signin"; role: Role; contact: string }
  | { kind: "signup"; input: SignUpInput };

const challenges = new Map<string, Challenge>();
const demoContacts: Record<Role, string> = {
  customer: "demo.customer@zemine.demo",
  merchant: "demo.merchant@zemine.demo",
};

const normalize = (c: string) => c.trim().toLowerCase().replace(/[\s()-]/g, "");

function assertOnline() {
  if (getScenario() === "offline") throw new ServiceError("offline", "No connection. Check your network and try again.");
}

export const mockAuth: AuthService = {
  async signIn({ role, contact, password }) {
    await wait(400);
    assertOnline();
    if (consumeScenario("locked")) throw new ServiceError("locked", "This account is locked after too many attempts. Reset your password to unlock it.");
    const key = normalize(contact);
    const isDemo = key === demoContacts[role];
    if (isDemo && password !== demoPassword) throw new ServiceError("invalid_credentials", "That password is not correct.");
    if (!isDemo) {
      if (!getDb().contacts.some((c) => c.role === role && normalize(c.contact) === key)) {
        throw new ServiceError("no_account", `No ${role} account found for that contact. Create one instead.`);
      }
      if (password.length < 8) throw new ServiceError("invalid_credentials", "That password is not correct.");
    }
    const challengeId = newId("ch");
    challenges.set(challengeId, { kind: "signin", role, contact });
    return { challengeId };
  },

  async signUp(input) {
    await wait(400);
    assertOnline();
    const key = normalize(input.contact);
    if (key === demoContacts[input.role] || getDb().contacts.some((c) => c.role === input.role && normalize(c.contact) === key)) {
      throw new ServiceError("invalid_credentials", "An account with that contact already exists. Sign in instead.");
    }
    const challengeId = newId("ch");
    challenges.set(challengeId, { kind: "signup", input });
    return { challengeId };
  },

  async verifyCode(challengeId, code) {
    await wait(350);
    assertOnline();
    const challenge = challenges.get(challengeId);
    if (!challenge) throw new ServiceError("unknown", "This code has expired. Request a new one.");
    if (consumeScenario("wrong_code") || code !== demoCode) throw new ServiceError("wrong_code", "That code is not right. Check it and try again.");
    challenges.delete(challengeId);

    let user: User;
    if (challenge.kind === "signup") {
      const { input } = challenge;
      resetDb(input.marketId, false);
      updateDb((db) => {
        db.contacts.push({ role: input.role, contact: input.contact, name: input.name, businessName: input.businessName });
        if (input.role === "customer") db.customer.name = input.name;
        else db.merchant.businessName = input.businessName ?? input.name;
      });
      user = { id: newId("usr"), role: input.role, name: input.name, contact: input.contact, businessName: input.businessName, marketId: input.marketId };
    } else {
      const key = normalize(challenge.contact);
      const isDemo = key === demoContacts[challenge.role];
      if (isDemo) resetDb(getDb().marketId, true);
      const known = getDb().contacts.find((c) => c.role === challenge.role && normalize(c.contact) === key);
      const db = getDb();
      user = {
        id: newId("usr"),
        role: challenge.role,
        name: known?.name ?? (challenge.role === "merchant" ? "Ines Marlowe" : db.customer.name),
        contact: challenge.contact,
        businessName: challenge.role === "merchant" ? (known?.businessName ?? db.merchant.businessName) : undefined,
        marketId: db.marketId,
      };
    }
    updateDb((db) => {
      db.user = user;
    });
    return user;
  },

  async resendCode() {
    await wait(400);
    assertOnline();
  },

  async requestReset() {
    await wait(400);
    assertOnline();
  },

  signOut() {
    updateDb((db) => {
      db.user = null;
    });
  },
};
