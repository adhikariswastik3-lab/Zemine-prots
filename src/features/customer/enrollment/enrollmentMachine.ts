export type EnrollStep =
  | "explain"
  | "consent"
  | "camera"
  | "framing"
  | "liveness"
  | "enrolling"
  | "active"
  | "permission_denied"
  | "low_light"
  | "liveness_failed"
  | "duplicate"
  | "error";

export interface EnrollState {
  step: EnrollStep;
  message?: string;
}

export type EnrollEvent =
  | { type: "START" }
  | { type: "ACCEPT_CONSENT" }
  | { type: "CAMERA_OK" }
  | { type: "CAMERA_DENIED" }
  | { type: "FRAME_OK" }
  | { type: "LOW_LIGHT" }
  | { type: "LIVENESS_OK" }
  | { type: "LIVENESS_FAILED" }
  | { type: "ENROLL_OK" }
  | { type: "DUPLICATE" }
  | { type: "ERROR"; message: string }
  | { type: "RETRY" }
  | { type: "RESTART" };

export const initialEnrollState: EnrollState = { step: "explain" };

const transitions: Partial<Record<EnrollStep, Partial<Record<EnrollEvent["type"], EnrollStep>>>> = {
  explain: { START: "consent" },
  consent: { ACCEPT_CONSENT: "camera" },
  camera: { CAMERA_OK: "framing", CAMERA_DENIED: "permission_denied" },
  framing: { FRAME_OK: "liveness", LOW_LIGHT: "low_light", CAMERA_DENIED: "permission_denied" },
  liveness: { LIVENESS_OK: "enrolling", LIVENESS_FAILED: "liveness_failed" },
  enrolling: { ENROLL_OK: "active", DUPLICATE: "duplicate", ERROR: "error" },
  permission_denied: { RETRY: "camera" },
  low_light: { RETRY: "framing" },
  liveness_failed: { RETRY: "liveness" },
  error: { RETRY: "enrolling" },
};

export function enrollReducer(state: EnrollState, event: EnrollEvent): EnrollState {
  if (event.type === "RESTART") return initialEnrollState;
  const next = transitions[state.step]?.[event.type];
  if (!next) return state;
  return { step: next, message: event.type === "ERROR" ? event.message : undefined };
}

export const progressSteps: { key: EnrollStep[]; title: string }[] = [
  { key: ["explain", "consent"], title: "Consent" },
  { key: ["camera", "permission_denied"], title: "Camera" },
  { key: ["framing", "low_light"], title: "Face framing" },
  { key: ["liveness", "liveness_failed"], title: "Liveness check" },
  { key: ["enrolling", "duplicate", "error", "active"], title: "Activation" },
];
