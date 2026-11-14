import { ServiceError } from "@/domain/types";
import type { BiometricProvider } from "../contracts";
import { getDb, updateDb } from "./db";
import { consumeScenario, getScenario, wait } from "./scenario";

function assertOnline() {
  if (getScenario() === "offline") throw new ServiceError("offline", "No connection. Check your network and try again.");
}

export const mockBiometric: BiometricProvider = {
  async checkFraming() {
    await wait(700);
    if (consumeScenario("low_light")) throw new ServiceError("low_light", "It is too dark to see your face clearly.");
  },

  async checkLiveness() {
    await wait(250);
    if (consumeScenario("liveness_failed")) throw new ServiceError("liveness_failed", "We could not confirm a live person.");
  },

  async enroll({ consentVersion }) {
    await wait(900);
    assertOnline();
    if (consumeScenario("duplicate")) throw new ServiceError("duplicate", "This face is already enrolled on another account.");
    const now = new Date().toISOString();
    updateDb((db) => {
      db.customer.enrollment = { status: "active", consentVersion, consentAt: now, enrolledAt: now };
    });
    return getDb().customer.enrollment;
  },

  setStatus(status) {
    updateDb((db) => {
      db.customer.enrollment =
        status === "revoked" ? { status: "revoked" } : { ...db.customer.enrollment, status };
    });
  },

  async match() {
    await wait(900);
    assertOnline();
    if (consumeScenario("liveness_failed")) throw new ServiceError("liveness_failed", "Liveness check failed.");
    if (consumeScenario("multiple_faces")) throw new ServiceError("multiple_faces", "More than one face is in view.");
    const { customer } = getDb();
    if (consumeScenario("no_match") || customer.enrollment.status !== "active") {
      throw new ServiceError("no_match", "No enrolled customer matched.");
    }
    const initials = customer.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
    return { id: "customer_primary", displayName: customer.name, initials, confidence: 0.998 };
  },
};
