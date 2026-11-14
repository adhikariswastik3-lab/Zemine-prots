import { useEffect, useReducer, useState } from "react";
import { goBack, navigate } from "@/app/router";
import { useSession } from "@/app/session";
import { toast } from "@/components/feedback/Toast";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import { CameraView, useCamera } from "@/components/ui/Camera";
import { Toggle } from "@/components/ui/Field";
import { Badge, Banner } from "@/components/ui/Feedback";
import Icon, { type IconName } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/Overlay";
import { consentVersion, DEMO_MODE } from "@/config/markets";
import { formatDateTime } from "@/domain/money";
import { ServiceError } from "@/domain/types";
import { services } from "@/services/firebase";
import { consumeScenario } from "@/services/mock/scenario";
import { useStepEffect } from "@/app/useStepEffect";
import { enrollReducer, initialEnrollState, progressSteps, type EnrollStep } from "./enrollmentMachine";

const livenessPrompts = ["Look straight at the camera", "Slowly turn your head left", "Now slowly turn right", "Blink twice"];

function ProgressList({ step }: { step: EnrollStep }) {
  const currentIndex = progressSteps.findIndex((p) => p.key.includes(step));
  return (
    <div className="progress-steps" role="list" aria-label="Setup progress">
      {progressSteps.map((p, i) => {
        const done = step === "active" || i < currentIndex;
        const current = !done && i === currentIndex;
        return (
          <div key={p.title} role="listitem" className={done ? "done" : current ? "current" : ""} aria-current={current ? "step" : undefined}>
            <b>{done ? <Icon name="check" /> : `0${i + 1}`}</b>
            <span><strong>{p.title}</strong><small>{done ? "Complete" : current ? "In progress" : "Up next"}</small></span>
          </div>
        );
      })}
    </div>
  );
}

function Failure({ icon = "alert", title, body, children }: { icon?: IconName; title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="fail-screen" style={{ paddingTop: 20 }}>
      <div className="fail-mark" aria-hidden="true"><Icon name={icon} /></div>
      <h2 style={{ fontSize: 28, marginBottom: 12 }} role="alert">{title}</h2>
      <p className="small muted">{body}</p>
      <div className="stack">{children}</div>
    </div>
  );
}

function Flow({ onExit }: { onExit: () => void }) {
  const [state, dispatch] = useReducer(enrollReducer, initialEnrollState);
  const [agreed, setAgreed] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const { step } = state;
  const cameraOn = step === "camera" || step === "framing" || step === "liveness";
  const camera = useCamera(cameraOn);
  const toggleMode = () => camera.setMode(camera.mode === "live" ? "simulated" : "live");

  useEffect(() => {
    if (step === "camera" && camera.state === "ready") {
      const t = window.setTimeout(() => dispatch({ type: "CAMERA_OK" }), 500);
      return () => window.clearTimeout(t);
    }
    if (step === "camera" && camera.state === "denied") dispatch({ type: "CAMERA_DENIED" });
  }, [step, camera.state]);

  useStepEffect(step, "framing", () => {
    services.biometric.checkFraming().then(
      () => dispatch({ type: "FRAME_OK" }),
      (e) => dispatch(e instanceof ServiceError && e.code === "low_light" ? { type: "LOW_LIGHT" } : { type: "ERROR", message: "Could not check your framing." }),
    );
  });

  useEffect(() => {
    if (step !== "liveness") return;
    let i = 0;
    let timer = 0;
    setPromptIndex(0);
    const tick = () => {
      if (i + 1 >= livenessPrompts.length) {
        services.biometric.checkLiveness().then(
          () => dispatch({ type: "LIVENESS_OK" }),
          () => dispatch({ type: "LIVENESS_FAILED" }),
        );
        return;
      }
      i += 1;
      setPromptIndex(i);
      timer = window.setTimeout(tick, 1400);
    };
    timer = window.setTimeout(tick, 1400);
    return () => window.clearTimeout(timer);
  }, [step]);

  useStepEffect(step, "enrolling", () => {
    services.biometric.enroll({ consentVersion }).then(
      () => dispatch({ type: "ENROLL_OK" }),
      (e) => dispatch(e instanceof ServiceError && e.code === "duplicate" ? { type: "DUPLICATE" } : { type: "ERROR", message: e instanceof ServiceError ? e.message : "Enrollment failed." }),
    );
  });

  const cancel = <button type="button" className="link-button" style={{ justifySelf: "center" }} onClick={onExit}>Cancel setup</button>;

  const body = (() => {
  if (step === "explain") {
    return (
      <>
        <div className="identity-visual" aria-hidden="true"><div className="vector-face"><i /></div><div className="vector-code">TEMPLATE / ENCRYPTED</div></div>
        <div className="stack-lg">
          <div className="stack">
            <p className="intro-copy">Setup takes about a minute. You'll agree to how your face data is used, check your camera, then complete a short liveness check.</p>
            <section className="security-strip"><Icon name="shield" /><div><strong>Your photo is not saved.</strong><p>We keep an encrypted face template. You can pause or remove it at any time.</p></div></section>
          </div>
          <Button block onClick={() => dispatch({ type: "START" })}>Begin setup</Button>
        </div>
      </>
    );
  }

  if (step === "consent") {
    return (
      <div className="stack-lg">
        <div className="match-card" style={{ background: "var(--color-paper)" }}>
          <p className="eyebrow">Biometric consent · v{consentVersion}</p>
          <p className="small" style={{ margin: 0, lineHeight: 1.7 }}>
            By continuing you allow Zemine to capture your face on this device, check that you are a live person, and store an encrypted template to verify you when you approve payments at merchants. Merchants never receive your template. You can pause or revoke this consent in Account at any time, and revoking stops face payments immediately.
          </p>
        </div>
        <Toggle checked={agreed} onChange={setAgreed} label="I agree to biometric processing" description="Required to enroll. Recorded with the version and time." />
        <div className="stack">
          <Button block disabled={!agreed} onClick={() => dispatch({ type: "ACCEPT_CONSENT" })}>Agree and continue</Button>
          {cancel}
        </div>
      </div>
    );
  }

  if (step === "camera") {
    return (
      <div className="stack-lg">
        <CameraView
          state={camera.state}
          mode={camera.mode}
          onToggleMode={toggleMode}
          videoRef={camera.videoRef}
          label="Calibrating scanner..."
          scanning
          phase="searching"
        />
        <p className="small muted" style={{ textAlign: "center" }} role="status">
          {camera.mode === "live" ? "Connecting to camera..." : "Starting biometric face scanner..."}
        </p>
        {cancel}
      </div>
    );
  }

  if (step === "framing") {
    return (
      <div className="stack-lg">
        <CameraView
          state={camera.state}
          mode={camera.mode}
          onToggleMode={toggleMode}
          videoRef={camera.videoRef}
          label="Hold still"
          scanning
          phase="steady"
        />
        <p className="prompt-big" role="status">Centre your face in the frame.</p>
        {cancel}
      </div>
    );
  }

  if (step === "liveness") {
    return (
      <div className="stack-lg">
        <CameraView
          state={camera.state}
          mode={camera.mode}
          onToggleMode={toggleMode}
          videoRef={camera.videoRef}
          label={`Step ${promptIndex + 1} of ${livenessPrompts.length}`}
          scanning
          phase="steady"
          livenessPrompt={livenessPrompts[promptIndex]}
        />
        <p className="prompt-big" role="status" aria-live="assertive">{livenessPrompts[promptIndex]}</p>
        {cancel}
      </div>
    );
  }

  if (step === "enrolling") {
    return (
      <div className="stack-lg" role="status" aria-live="polite">
        <div className="fail-screen" style={{ paddingTop: 30 }}>
          <div className="fail-mark" style={{ background: "var(--color-green)" }}><span className="spinner" style={{ width: 34, height: 34, borderWidth: 4 }} /></div>
          <h2 style={{ fontSize: 26 }}>Creating your identity...</h2>
          <p className="small muted">Encrypting your template and checking it isn't already enrolled.</p>
        </div>
      </div>
    );
  }

  if (step === "active") {
    return (
      <div className="stack-lg">
        <div className="fail-screen" style={{ paddingTop: 20 }}>
          <div className="fail-mark" style={{ background: "var(--color-green)" }}><Icon name="check" /></div>
          <h2 style={{ fontSize: 30, marginBottom: 12 }}>You're enrolled.</h2>
          <p className="small muted">Merchants can now request payments that you approve with your face.</p>
        </div>
        <Button block onClick={() => { toast("Face identity activated"); onExit(); }}>Done</Button>
      </div>
    );
  }

  if (step === "permission_denied") {
    return (
      <Failure icon="camera" title="Camera access is blocked" body="Zemine needs your camera to enroll. Allow camera access for this site in your browser settings, then try again.">
        <Button block onClick={() => { consumeScenario("camera_denied"); camera.retry(); dispatch({ type: "RETRY" }); }}>Try again</Button>
        {cancel}
      </Failure>
    );
  }
  if (step === "low_light") {
    return (
      <Failure icon="alert" title="It's too dark" body="Move to a brighter place so your face is evenly lit, with no strong light behind you.">
        <Button block onClick={() => dispatch({ type: "RETRY" })}>Try again</Button>
        {cancel}
      </Failure>
    );
  }
  if (step === "liveness_failed") {
    return (
      <Failure title="We couldn't confirm it's you live" body="Remove hats or sunglasses, face the camera and follow each prompt slowly.">
        <Button block onClick={() => dispatch({ type: "RETRY" })}>Try again</Button>
        {cancel}
      </Failure>
    );
  }
  if (step === "duplicate") {
    return (
      <Failure icon="face" title="This face is already enrolled" body="A Zemine identity already exists for this face. Sign in to that account, or contact support if you believe this is a mistake.">
        <Button block variant="secondary" onClick={() => dispatch({ type: "RESTART" })}>Start over</Button>
        {cancel}
      </Failure>
    );
  }
  return (
    <Failure icon="wifi" title="Enrollment didn't finish" body={state.message ?? "Something went wrong. Nothing was saved."}>
      <Button block onClick={() => dispatch({ type: "RETRY" })}>Try again</Button>
      {cancel}
    </Failure>
  );
  })();

  return (
    <>
      {step !== "explain" && step !== "active" && <ProgressList step={step} />}
      {body}
    </>
  );
}

export default function Enrollment() {
  const { db, market } = useSession();
  const { enrollment } = db.customer;
  const [flowing, setFlowing] = useState(enrollment.status === "none");
  const [confirm, setConfirm] = useState<"revoke" | "suspend" | null>(null);

  const apply = (status: "active" | "suspended" | "revoked", message: string) => {
    services.biometric.setStatus(status);
    setConfirm(null);
    toast(message);
  };

  if (flowing) {
    return (
      <main className="screen no-nav" id="main">
        <Header eyebrow="Biometric identity" title="Set up face pay." onBack={() => goBack("/customer")} />
        <Flow onExit={() => { setFlowing(false); navigate("/customer"); }} />
      </main>
    );
  }

  const label = { active: "Active", suspended: "Paused", revoked: "Removed", none: "Not set up" }[enrollment.status];
  return (
    <main className="screen" id="main">
      <Header eyebrow="Biometric identity" title="Your face, your control." onBack={() => goBack("/customer")} />
      <div className="identity-visual" aria-hidden="true"><div className="vector-face"><i /></div><div className="vector-code">STATUS / {label.toUpperCase()}</div></div>
      <div className="stack-lg">
        <div className="row between">
          <div><p className="eyebrow">Face payments</p><strong style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400 }}>{label}</strong></div>
          <Badge tone={enrollment.status === "active" ? "dark" : "warn"}>{label}</Badge>
        </div>
        {enrollment.consentAt && (
          <dl className="detail-list" style={{ margin: 0 }}>
            <div><dt>Consent version</dt><dd>{enrollment.consentVersion}</dd></div>
            <div><dt>Consent given</dt><dd>{formatDateTime(enrollment.consentAt, market)}</dd></div>
            {enrollment.enrolledAt && <div><dt>Enrolled</dt><dd>{formatDateTime(enrollment.enrolledAt, market)}</dd></div>}
          </dl>
        )}
        {enrollment.status === "active" && <Banner tone="success" title="Ready to pay">Merchants can request payments. You approve each one with your face.</Banner>}
        {enrollment.status === "suspended" && <Banner tone="warn" title="Face payments are paused">No merchant can match your face until you resume.</Banner>}
        {enrollment.status === "revoked" && <Banner tone="warn" title="Your face template was removed">Re-enroll to use face payments again.</Banner>}
        <div className="stack">
          {enrollment.status === "active" && <Button block variant="secondary" onClick={() => setConfirm("suspend")}>Pause face payments</Button>}
          {enrollment.status === "suspended" && <Button block onClick={() => apply("active", "Face payments resumed")}>Resume face payments</Button>}
          {enrollment.status !== "revoked" && <Button block variant="secondary" onClick={() => setFlowing(true)}>Re-enroll my face</Button>}
          {enrollment.status === "revoked" && <Button block onClick={() => setFlowing(true)}>Enroll again</Button>}
          {enrollment.status !== "revoked" && <Button block variant="danger" onClick={() => setConfirm("revoke")}>Remove my face data</Button>}
        </div>
      </div>
      {confirm === "suspend" && <ConfirmDialog title="Pause face payments?" body="Merchants won't be able to match your face until you resume." confirmLabel="Pause" onConfirm={() => apply("suspended", "Face payments paused")} onCancel={() => setConfirm(null)} />}
      {confirm === "revoke" && <ConfirmDialog title="Remove your face data?" body="This deletes your face template and stops face payments immediately. You can enroll again later." confirmLabel="Remove face data" tone="danger" onConfirm={() => apply("revoked", "Face data removed")} onCancel={() => setConfirm(null)} />}
    </main>
  );
}
