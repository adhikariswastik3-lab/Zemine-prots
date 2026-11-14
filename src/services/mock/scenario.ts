import { useSyncExternalStore } from "react";

export const scenarios = [
  { id: "success", label: "Everything works" },
  { id: "offline", label: "Network offline" },
  { id: "wrong_code", label: "Wrong verification code" },
  { id: "locked", label: "Account locked" },
  { id: "camera_denied", label: "Camera permission denied" },
  { id: "low_light", label: "Low light" },
  { id: "liveness_failed", label: "Liveness check fails" },
  { id: "duplicate", label: "Duplicate face / duplicate charge" },
  { id: "no_match", label: "No customer match" },
  { id: "multiple_faces", label: "Multiple faces" },
  { id: "insufficient_funds", label: "Insufficient funds" },
  { id: "limit_exceeded", label: "Limit exceeded" },
  { id: "authorization_failed", label: "Authorization declined" },
  { id: "unknown_result", label: "Unknown result (timeout)" },
] as const;

export type ScenarioId = (typeof scenarios)[number]["id"];

let current: ScenarioId = "success";
const listeners = new Set<() => void>();

export const getScenario = () => current;

export function setScenario(next: ScenarioId) {
  current = next;
  listeners.forEach((l) => l());
}

export function useScenario(): ScenarioId {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

/** One-shot scenarios fire once and then reset, so retry demonstrates recovery. */
export function consumeScenario(id: ScenarioId): boolean {
  if (current !== id) return false;
  if (id !== "offline") setScenario("success");
  return true;
}

/** "fast" is the snappy default; "realistic" doubles every delay to demo real-world network timing. */
let speed: "fast" | "realistic" = "fast";
const speedListeners = new Set<() => void>();
export const getSpeed = () => speed;
export const speedFactor = () => (speed === "fast" ? 1 : 2);
export function setSpeed(next: "fast" | "realistic") {
  speed = next;
  speedListeners.forEach((l) => l());
}
export function useSpeed() {
  return useSyncExternalStore(
    (cb) => {
      speedListeners.add(cb);
      return () => speedListeners.delete(cb);
    },
    () => speed,
  );
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms * speedFactor()));
