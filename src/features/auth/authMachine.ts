export type AuthStep = "credentials" | "business" | "verify" | "forgot" | "forgot_sent";

export interface AuthState {
  step: AuthStep;
  mode: "login" | "signup";
  status: "idle" | "submitting";
  error?: string;
  errorCode?: string;
  challengeId?: string;
  resendIn: number;
}

export type AuthAction =
  | { type: "SET_MODE"; mode: "login" | "signup" }
  | { type: "GO"; step: AuthStep }
  | { type: "SUBMIT" }
  | { type: "FAIL"; error: string; code?: string }
  | { type: "CHALLENGE"; challengeId: string }
  | { type: "TICK" }
  | { type: "RESENT" };

export const RESEND_SECONDS = 30;

export const initialAuthState: AuthState = { step: "credentials", mode: "login", status: "idle", resendIn: 0 };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_MODE":
      return { ...initialAuthState, mode: action.mode };
    case "GO":
      return { ...state, step: action.step, status: "idle", error: undefined, errorCode: undefined };
    case "SUBMIT":
      return { ...state, status: "submitting", error: undefined, errorCode: undefined };
    case "FAIL":
      return { ...state, status: "idle", error: action.error, errorCode: action.code };
    case "CHALLENGE":
      return { ...state, step: "verify", challengeId: action.challengeId, status: "idle", error: undefined, errorCode: undefined, resendIn: RESEND_SECONDS };
    case "TICK":
      return { ...state, resendIn: Math.max(0, state.resendIn - 1) };
    case "RESENT":
      return { ...state, status: "idle", resendIn: RESEND_SECONDS };
  }
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
export const isPhone = (v: string) => /^\+?[\d\s()-]{7,20}$/.test(v.trim()) && v.replace(/\D/g, "").length >= 7;
