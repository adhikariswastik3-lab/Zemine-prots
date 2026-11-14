import { useSyncExternalStore } from "react";

export interface Prefs {
  sound: boolean;
  haptics: boolean;
  motion: boolean;
  pin: string;
  expressCheckout: boolean;
}

const KEY = "zemine.prefs.v1";
const defaults: Prefs = { sound: true, haptics: true, motion: true, pin: "", expressCheckout: true };

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* use defaults */
  }
  return defaults;
}

let state = load();
const listeners = new Set<() => void>();

function apply() {
  if (typeof document !== "undefined") document.documentElement.dataset.motion = state.motion ? "on" : "off";
}
apply();

export const getPrefs = () => state;

export function setPrefs(patch: Partial<Prefs>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  apply();
  listeners.forEach((l) => l());
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}
