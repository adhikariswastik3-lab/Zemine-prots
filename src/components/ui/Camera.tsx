import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getScenario } from "@/services/mock/scenario";

export type CameraMode = "live" | "simulated";
export type CameraState = "idle" | "requesting" | "ready" | "denied" | "unavailable";

export function useCamera(enabled: boolean, facingMode: "user" | "environment" = "user") {
  const [state, setState] = useState<CameraState>("idle");
  const [mode, setMode] = useState<CameraMode>("simulated");
  const [attempt, setAttempt] = useState(0);
  const stream = useRef<MediaStream | null>(null);
  const node = useRef<HTMLVideoElement | null>(null);

  const videoRef = useCallback((el: HTMLVideoElement | null) => {
    node.current = el;
    if (el && stream.current) el.srcObject = stream.current;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    // If user explicitly picked camera_denied scenario in DEMO controls, respect it
    if (getScenario() === "camera_denied") {
      setState("denied");
      return;
    }

    setState("requesting");

    // Fallback timer: if browser permission hangs or is blocked silently by iframe sandbox,
    // smoothly proceed with simulated scanner so user is never trapped.
    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled && state !== "ready") {
        setMode("simulated");
        setState("ready");
      }
    }, 1400);

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        clearTimeout(fallbackTimer);
        if (!cancelled) {
          setMode("simulated");
          setState("ready");
        }
        return;
      }

      let s: MediaStream | null = null;
      try {
        // Attempt 1: try ideal facingMode
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
      } catch {
        // Attempt 2: fallback to any webcam (for desktop laptops with only front camera)
        try {
          s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch {
          s = null;
        }
      }

      clearTimeout(fallbackTimer);
      if (cancelled) {
        s?.getTracks().forEach((t) => t.stop());
        return;
      }

      if (s) {
        stream.current = s;
        if (node.current) node.current.srcObject = s;
        setMode("live");
        setState("ready");
      } else {
        // Camera unavailable or blocked in iframe — use simulated scanner
        setMode("simulated");
        setState("ready");
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      setState("idle");
    };
  }, [enabled, facingMode, attempt]);

  return {
    state,
    mode,
    setMode,
    videoRef,
    retry: () => setAttempt((a) => a + 1),
  };
}

/** Animated biometric face avatar with landmarks, reticle, and liveness responses */
function BiometricFaceMesh({
  phase = "searching",
  livenessPrompt,
}: {
  phase?: "searching" | "steady" | "matched";
  livenessPrompt?: string;
}) {
  const [hash, setHash] = useState("A4F9");

  useEffect(() => {
    const t = window.setInterval(() => {
      setHash(Math.floor(0x1000 + Math.random() * 0xefff).toString(16).toUpperCase());
    }, 240);
    return () => window.clearInterval(t);
  }, []);

  // Interpret liveness prompt into face pose transform
  const lower = (livenessPrompt ?? "").toLowerCase();
  let poseClass = "pose-center";
  if (lower.includes("left")) poseClass = "pose-left";
  else if (lower.includes("right")) poseClass = "pose-right";
  else if (lower.includes("blink")) poseClass = "pose-blink";

  const color =
    phase === "matched"
      ? "var(--color-live)"
      : phase === "steady"
      ? "var(--color-yellow)"
      : "var(--color-orange)";

  return (
    <div className={`biometric-face-wrap ${poseClass}`} aria-hidden="true">
      <svg viewBox="0 0 200 240" className="biometric-svg">
        <defs>
          <radialGradient id="mesh-glow" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Subtle background radar circles */}
        <circle cx="100" cy="115" r="75" stroke={color} strokeWidth="1" strokeDasharray="3 4" opacity="0.25" fill="url(#mesh-glow)" />
        <circle cx="100" cy="115" r="48" stroke={color} strokeWidth="1" strokeDasharray="2 4" opacity="0.3" fill="none" />

        {/* Head outer contour */}
        <path
          d="M 52 88 C 52 48, 148 48, 148 88 C 148 135, 126 178, 100 182 C 74 178, 52 135, 52 88 Z"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={phase === "matched" ? "none" : "4 3"}
          className="head-contour"
        />

        {/* Forehead landmark nodes */}
        <g className="landmarks">
          <circle cx="76" cy="68" r="2.5" fill={color} />
          <circle cx="100" cy="64" r="3" fill={color} />
          <circle cx="124" cy="68" r="2.5" fill={color} />

          {/* Eyebrows */}
          <path d="M 68 84 Q 82 80 94 84" stroke={color} strokeWidth="1.5" fill="none" />
          <path d="M 106 84 Q 118 80 132 84" stroke={color} strokeWidth="1.5" fill="none" />

          {/* Eyes */}
          <g className="mesh-eyes">
            <circle cx="81" cy="95" r="5" stroke={color} strokeWidth="1.5" fill="none" />
            <circle cx="81" cy="95" r="2" fill={color} />
            <circle cx="119" cy="95" r="5" stroke={color} strokeWidth="1.5" fill="none" />
            <circle cx="119" cy="95" r="2" fill={color} />
          </g>

          {/* Nose bridge & tip */}
          <line x1="100" y1="84" x2="100" y2="120" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
          <polygon points="100,118 94,126 106,126" stroke={color} strokeWidth="1.5" fill="none" />

          {/* Cheekbones */}
          <circle cx="66" cy="116" r="2" fill={color} />
          <circle cx="134" cy="116" r="2" fill={color} />
          <path d="M 66 116 L 94 126 L 100 138 L 106 126 L 134 116" stroke={color} strokeWidth="1" strokeDasharray="2 3" opacity="0.6" fill="none" />

          {/* Mouth & smile line */}
          <path d="M 86 148 Q 100 156 114 148" stroke={color} strokeWidth="2" fill="none" />
          <circle cx="86" cy="148" r="1.5" fill={color} />
          <circle cx="114" cy="148" r="1.5" fill={color} />

          {/* Jawline & chin */}
          <path d="M 60 126 Q 74 168 100 178 Q 126 168 140 126" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
          <circle cx="100" cy="178" r="3" fill={color} />
        </g>

        {/* Center crosshair reticle */}
        <g className="reticle" stroke={color} strokeWidth="1.5">
          <line x1="88" y1="115" x2="94" y2="115" />
          <line x1="106" y1="115" x2="112" y2="115" />
          <line x1="100" y1="103" x2="100" y2="109" />
          <line x1="100" y1="121" x2="100" y2="127" />
        </g>
      </svg>

      {/* Cryptographic telemetry label */}
      <div className="telemetry-bar">
        <span className="telemetry-hash">ZMN·{hash}</span>
        <span className="telemetry-status">
          {phase === "matched"
            ? "MATCH 99.8%"
            : phase === "steady"
            ? "LOCKED 96%"
            : "LOCKING 48%"}
        </span>
      </div>
    </div>
  );
}

export function CameraView({
  state,
  mode = "simulated",
  onToggleMode,
  videoRef,
  label,
  scanning,
  phase,
  livenessPrompt,
  children,
}: {
  state: CameraState;
  mode?: CameraMode;
  onToggleMode?: () => void;
  videoRef: (el: HTMLVideoElement | null) => void;
  label?: string;
  scanning?: boolean;
  phase?: "searching" | "steady" | "matched";
  livenessPrompt?: string;
  children?: ReactNode;
}) {
  const isLive = mode === "live" && state === "ready";

  return (
    <div
      className="camera-box"
      data-phase={phase}
      role="img"
      aria-label={isLive ? "Live camera face scanner" : "Biometric face scanner"}
    >
      {/* Video feed if live camera is active */}
      {isLive ? (
        <video ref={videoRef} autoPlay playsInline muted />
      ) : null}

      {/* Biometric mesh overlay (on top of video or standalone) */}
      <BiometricFaceMesh phase={phase} livenessPrompt={livenessPrompt} />

      {/* Corner targeting brackets */}
      <span className="corner c1" />
      <span className="corner c2" />
      <span className="corner c3" />
      <span className="corner c4" />

      {/* Animated laser scan line */}
      {scanning && <span className="scan-line" />}

      {/* Scan status label */}
      {label && <div className="scan-label">{label}</div>}

      {/* Mode badge: Live vs Simulated */}
      {onToggleMode && (
        <button
          type="button"
          className="camera-mode-pill"
          onClick={onToggleMode}
          aria-label={`Current scanner: ${isLive ? "Live camera" : "Simulated face"}. Tap to switch.`}
        >
          {isLive ? "📷 Live" : "⚡ Simulated"}
        </button>
      )}

      {children}
    </div>
  );
}
