import { useEffect, useReducer, useState } from "react";
import { goBack, navigate } from "@/app/router";
import { cue } from "@/app/feedback";
import { usePrefs } from "@/app/prefs";
import { useSession } from "@/app/session";
import { useStepEffect } from "@/app/useStepEffect";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import { CameraView, useCamera } from "@/components/ui/Camera";
import { Banner } from "@/components/ui/Feedback";
import PinGate from "@/components/ui/PinGate";
import Icon, { type IconName } from "@/components/ui/Icon";
import { DEMO_MODE } from "@/config/markets";
import { digitsToMinor, formatDateTime, formatMoney } from "@/domain/money";
import { ServiceError } from "@/domain/types";
import { services } from "@/services/firebase";
import { consumeScenario, getScenario, speedFactor } from "@/services/mock/scenario";
import { checkoutReducer, initCheckout, initialCheckoutState, type FailureName } from "./checkoutMachine";

type Action = "rescan" | "retry_auth" | "edit_amount" | "status" | "camera" | "cancel";

const failures: Record<FailureName, { icon: IconName; title: string; body: string; actions: Action[] }> = {
  camera_denied: { icon: "camera", title: "Camera is blocked", body: "Allow camera access for this site in your browser settings, then try again.", actions: ["camera", "cancel"] },
  no_match: { icon: "face", title: "No match found", body: "We couldn't match this person to an enrolled customer. Ask them to check they've enrolled and that face payments aren't paused.", actions: ["rescan", "cancel"] },
  multiple_faces: { icon: "face", title: "More than one face", body: "Make sure only the paying customer is in front of the camera.", actions: ["rescan", "cancel"] },
  liveness_failed: { icon: "alert", title: "Liveness check failed", body: "We couldn't confirm a live person. Ask the customer to face the camera directly in good light.", actions: ["rescan", "cancel"] },
  offline: { icon: "wifi", title: "You're offline", body: "No connection. No payment has been taken. Reconnect and try again.", actions: ["rescan", "cancel"] },
  insufficient_funds: { icon: "wallet", title: "Insufficient funds", body: "The customer's balance can't cover this amount. Try a smaller amount, or take payment another way.", actions: ["edit_amount", "cancel"] },
  limit_exceeded: { icon: "alert", title: "Above payment limit", body: "This amount is higher than the customer's per-payment limit.", actions: ["edit_amount", "cancel"] },
  authorization_failed: { icon: "alert", title: "Payment declined", body: "The payment didn't go through and the customer was not charged.", actions: ["retry_auth", "edit_amount", "cancel"] },
  duplicate_detected: { icon: "check", title: "Already paid", body: "This payment was already completed. Check its status to see the receipt, and avoid charging again.", actions: ["status"] },
  unknown_result: { icon: "clock", title: "We're not sure it went through", body: "The result didn't come back in time. Check the status before trying again so the customer isn't charged twice.", actions: ["status"] },
};

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"];
const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k_${Date.now()}_${Math.random()}`);

export default function Checkout() {
  const { db, user, market } = useSession();
  const merchantName = user?.businessName ?? db.merchant.businessName;
  const [s, dispatch] = useReducer(checkoutReducer, initialCheckoutState, initCheckout);
  const { pin, expressCheckout } = usePrefs();
  const [unlocked, setUnlocked] = useState(false);
  const [steady, setSteady] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const offline = !online || getScenario() === "offline";
  const [checking, setChecking] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const minor = digitsToMinor(s.digits);
  const maxMinor = market.limits.perTransactionMinor;
  const amountError = s.digits && minor < market.minAmountMinor ? `Minimum is ${formatMoney(market.minAmountMinor, market)}` : s.digits && minor > maxMinor ? `Maximum per payment is ${formatMoney(maxMinor, market)}` : "";
  const cameraOn = s.name === "camera_permission" || s.name === "capturing" || s.name === "matching";
  const camera = useCamera(cameraOn, "environment");

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  useEffect(() => {
    if (s.name === "succeeded") cue("success");
    else if (s.name in failures) cue("error");
  }, [s.name]);

  useEffect(() => {
    setSteady(false);
    if (s.name !== "capturing") return;
    const t = window.setTimeout(() => setSteady(true), 450 * speedFactor());
    return () => window.clearTimeout(t);
  }, [s.name]);

  useEffect(() => {
    if (s.name !== "draft") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("button, a, input, select")) return;
      if (/^\d$/.test(e.key)) dispatch({ type: "DIGIT", digit: e.key });
      if (e.key === "Backspace") dispatch({ type: "BACKSPACE" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.name]);

  useEffect(() => {
    if (s.name === "camera_permission" && camera.state === "ready") dispatch({ type: "CAMERA_OK" });
    if (s.name === "camera_permission" && camera.state === "denied") dispatch({ type: "CAMERA_DENIED" });
  }, [s.name, camera.state]);

  useStepEffect(s.name, "capturing", () => {
    window.setTimeout(() => dispatch({ type: "CAPTURED" }), 1100 * speedFactor());
  });

  useStepEffect(s.name, "matching", () => {
    services.biometric.match().then(
      (customer) => dispatch({ type: "MATCH_OK", customer }),
      (e) => dispatch({ type: "FAIL", code: e instanceof ServiceError ? e.code : "no_match", message: e instanceof ServiceError ? e.message : undefined }),
    );
  });

  useStepEffect(s.name, "matched", () => {
    if (!expressCheckout) return;
    const t = window.setTimeout(() => dispatch({ type: "CONFIRM" }), 900);
    return () => window.clearTimeout(t);
  });

  useStepEffect(s.name, "authorizing", () => {
    services.payments.authorize({ customerId: s.customer?.id ?? "", amountMinor: minor, idempotencyKey: s.idempotencyKey }).then(
      (receipt) => dispatch({ type: "AUTH_OK", receipt }),
      (e) => dispatch({ type: "FAIL", code: e instanceof ServiceError ? e.code : "authorization_failed", message: e instanceof ServiceError ? e.message : undefined }),
    );
  });

  useEffect(() => {
    if (s.name !== "succeeded") return;
    setCountdown(15);
    const t = window.setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearInterval(t);
  }, [s.name]);

  useEffect(() => {
    if (s.name === "succeeded" && countdown <= 0) dispatch({ type: "RESET" });
  }, [s.name, countdown]);

  async function checkStatus() {
    setChecking(true);
    try {
      const receipt = await services.payments.lookup(s.idempotencyKey);
      dispatch(receipt ? { type: "RESOLVED", receipt } : { type: "NOT_FOUND" });
    } catch {
      dispatch({ type: "FAIL", code: "offline" });
    } finally {
      setChecking(false);
    }
  }

  const amountText = formatMoney(minor, market);

  const recent = [...new Set(db.merchant.transactions.filter((t) => t.kind === "face_payment" && t.amountMinor > 0).map((t) => t.amountMinor))].slice(0, 3);

  if (s.name === "draft" && pin && !unlocked) {
    return <PinGate pin={pin} title="Enter PIN to start a sale" onSuccess={() => setUnlocked(true)} onCancel={() => goBack("/merchant")} />;
  }

  if (s.name === "draft") {
    return (
      <main className="screen" id="main">
        <Header eyebrow="New face payment" title="Enter the amount." onBack={() => goBack("/merchant")} />
        <div className="amount-entry">
          <span>{market.currency}</span>
          <p key={s.digits} className={`amount-display ${s.digits ? "pop" : "empty-amount"}`} aria-live="polite" aria-label={`Amount ${amountText}`}>{amountText}</p>
          {amountError && <p role="alert" className="small" style={{ color: "var(--color-danger)", marginTop: 8 }}>{amountError}</p>}
        </div>
        {offline && <div className="offline-bar"><Banner tone="warn" title="You're offline" icon="wifi">Reconnect to take a payment. Nothing is queued.</Banner></div>}
        {!s.digits && recent.length > 0 && (
          <div className="quick-amounts" role="group" aria-label="Recent amounts">
            {recent.map((m) => <button key={m} type="button" className="chip" onClick={() => { cue("tap"); dispatch({ type: "SET_DIGITS", digits: String(m) }); }}>{formatMoney(m, market)}</button>)}
          </div>
        )}
        <div className="number-pad">
          {keys.map((k) => (
            <button key={k} type="button" aria-label={k === "back" ? "Delete last digit" : k} onClick={() => { cue("tap"); dispatch(k === "back" ? { type: "BACKSPACE" } : { type: "DIGIT", digit: k }); }}>
              {k === "back" ? "⌫" : k}
            </button>
          ))}
        </div>
        <Button block disabled={!s.digits || !!amountError || offline} onClick={() => dispatch({ type: "SUBMIT_AMOUNT", key: newKey() })}>
          <Icon name="scan" />
          <span>{s.digits && !amountError ? `Scan face to pay ${amountText}` : "Scan face to pay"}</span>
        </Button>
      </main>
    );
  }

  if (s.name === "customer_review") {
    return (
      <main className="screen no-nav review-screen" id="main">
        <div className="stack-lg" style={{ textAlign: "center", paddingTop: 20 }}>
          <div>
            <p className="eyebrow">Customer review</p>
            <h1 tabIndex={-1} data-page-title style={{ fontSize: 30 }}>{merchantName} is requesting</h1>
          </div>
          <div className="review-total"><p className="eyebrow">Amount to pay</p><h2>{amountText}</h2></div>
          <p className="small">Hand the device to the customer. They approve the amount, then look at the camera to confirm it's them.</p>
          <div className="stack">
            <Button block onClick={() => dispatch({ type: "CUSTOMER_APPROVE" })}>Approve and continue</Button>
            <Button block variant="secondary" onClick={() => dispatch({ type: "CUSTOMER_DECLINE" })}>Decline</Button>
          </div>
        </div>
      </main>
    );
  }

  if (s.name === "camera_permission" || s.name === "capturing" || s.name === "matching") {
    const label = s.name === "camera_permission" ? "Starting camera" : s.name === "capturing" ? (steady ? "Hold steady" : "Looking for a face") : "Matching...";
    const phase = s.name === "capturing" && !steady ? "searching" : s.name === "camera_permission" ? undefined : "steady";
    const hint = s.name === "capturing" && !steady ? "Move closer and face the camera." : s.name === "capturing" ? "Got it. Hold still, capturing now." : s.name === "matching" ? "Checking identity..." : "";
    return (
      <main className="screen no-nav" id="main" style={{ textAlign: "center" }}>
        <Header eyebrow={`Charge · ${amountText}`} title={s.name === "matching" ? "Checking identity." : "Ask customer to look."} />
        <div className="scanner-amount-banner">
          <p className="eyebrow">Paying {merchantName}</p>
          <div className="scanner-amount">{amountText}</div>
          <p className="scanner-subtitle">Look at the camera to authorize</p>
        </div>
        <CameraView
          state={camera.state}
          mode={camera.mode}
          onToggleMode={() => camera.setMode(camera.mode === "live" ? "simulated" : "live")}
          videoRef={camera.videoRef}
          label={label}
          scanning={s.name !== "camera_permission"}
          phase={phase}
        />
        <p className="scan-hint" aria-live="polite">{hint}</p>
        <p className="small" role="status" style={{ maxWidth: 320, margin: "0 auto 18px" }}>
          {camera.mode === "live" ? "Face the camera directly. Biometric match runs automatically." : "Simulated biometric scan active. Move closer to match."}
        </p>
        {s.name !== "matching" && <button type="button" className="link-button" onClick={() => dispatch({ type: "CANCEL" })}>Cancel sale</button>}
      </main>
    );
  }

  if (s.name === "matched" && s.customer) {
    if (expressCheckout) {
      return (
        <main className="screen no-nav" id="main">
          <Header eyebrow={`Charge · ${amountText}`} title="Customer matched." />
          <div className="match-card express">
            <div className="match-person">
              <span aria-hidden="true">{s.customer.initials}</span>
              <div>
                <p className="eyebrow">Verified · {(s.customer.confidence * 100).toFixed(1)}% match</p>
                <h2>{s.customer.displayName}</h2>
              </div>
            </div>
            <div className="auto-charge-bar">
              <div className="auto-charge-progress-track">
                <div className="auto-charge-progress-fill" />
              </div>
              <p className="small"><strong>Charging {amountText} automatically...</strong></p>
            </div>
            <Button variant="ghost" block onClick={() => dispatch({ type: "CANCEL" })}>Cancel payment</Button>
          </div>
        </main>
      );
    }
    return (
      <main className="screen no-nav" id="main">
        <Header eyebrow={`Charge · ${amountText}`} title="Customer found." />
        <div className="match-card">
          <div className="match-person"><span aria-hidden="true">{s.customer.initials}</span><div><p className="eyebrow">Match · {(s.customer.confidence * 100).toFixed(1)}%</p><h2>{s.customer.displayName}</h2></div></div>
          <p className="small" style={{ margin: "12px 0 0" }}>Confirm the customer's name out loud before you charge.</p>
          <div className="match-actions">
            <Button variant="secondary" onClick={() => dispatch({ type: "RETRY_SCAN" })}>Not them</Button>
            <Button onClick={() => dispatch({ type: "CONFIRM" })}>Charge {amountText}</Button>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 18 }}><button type="button" className="link-button" onClick={() => dispatch({ type: "CANCEL" })}>Cancel sale</button></div>
      </main>
    );
  }

  if (s.name === "authorizing") {
    return (
      <main className="screen no-nav fail-screen" id="main" role="status" aria-live="polite">
        <div className="fail-mark" style={{ background: "var(--color-green)" }}><span className="spinner" style={{ width: 34, height: 34, borderWidth: 4 }} /></div>
        <h1 tabIndex={-1} data-page-title>Processing payment...</h1>
        <p className="small muted">Charging {amountText}. Please don't close this screen.</p>
      </main>
    );
  }

  if (s.name === "succeeded" && s.receipt) {
    return (
      <main className="screen no-nav success-screen" id="main">
        <div className="success-flash" aria-hidden="true" />
        <div className="success-burst" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ "--a": `${i * 45}deg` } as React.CSSProperties} />)}<div className="success-stamp">PAID</div></div>
        <p className="eyebrow">Transaction complete</p>
        <h1 tabIndex={-1} data-page-title>Payment received.</h1>
        <p className="success-copy">{formatMoney(s.receipt.amountMinor, market)} from {s.receipt.customerName} will be included in your next settlement.</p>
        <div className="receipt reveal-group">
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10, borderBottom: "1.5px dashed var(--color-ink)", marginBottom: 4 }}>
            <img src="/logo.png" width={24} height={24} alt="" style={{ borderRadius: 5, border: "1.5px solid var(--color-ink)" }} />
            <strong style={{ font: "13px var(--font-display)", letterSpacing: "1px" }}>ZEMINE TERMINAL RECEIPT</strong>
          </div>
          <div className="line" style={{ "--i": 0 } as React.CSSProperties}><span>Customer</span><span>{s.receipt.customerName}</span></div>
          <div className="line" style={{ "--i": 1 } as React.CSSProperties}><span>Time</span><span>{formatDateTime(s.receipt.at, market)}</span></div>
          <div className="line" style={{ "--i": 2 } as React.CSSProperties}><span>Reference</span><span>{s.receipt.reference}</span></div>
          <div className="line" style={{ "--i": 3 } as React.CSSProperties}><span>Total</span><strong>{formatMoney(s.receipt.amountMinor, market)}</strong></div>
        </div>
        <div className="stack">
          <Button block onClick={() => dispatch({ type: "RESET" })}>New sale</Button>
          <Button block variant="secondary" onClick={() => navigate("/merchant")}>Back to dashboard</Button>
          <p className="small muted" aria-live="off">Next sale starts in {Math.max(countdown, 0)}s</p>
        </div>
      </main>
    );
  }

  if (s.name === "cancelled") {
    return (
      <main className="screen no-nav fail-screen" id="main">
        <div className="fail-mark" aria-hidden="true"><Icon name="close" /></div>
        <h1 tabIndex={-1} data-page-title>Sale cancelled.</h1>
        <p className="small muted">{s.message ?? "No charge was made."}</p>
        <div className="stack">
          <Button block onClick={() => dispatch({ type: "RESET" })}>Start a new sale</Button>
          <Button block variant="secondary" onClick={() => navigate("/merchant")}>Back to dashboard</Button>
        </div>
      </main>
    );
  }

  const name = s.name as FailureName;
  const f = failures[name] ?? failures.authorization_failed;
  const actions: Action[] = name === "offline" && s.offlineFrom === "authorizing" ? ["retry_auth", "cancel"] : f.actions;
  const body = s.message && name !== "offline" && name !== "authorization_failed" ? `${f.body}` : name === "authorization_failed" && s.message ? s.message : f.body;
  const run: Record<Action, { label: string; variant: "primary" | "secondary" | "ghost"; onClick: () => void }> = {
    rescan: { label: "Scan again", variant: "primary", onClick: () => dispatch({ type: "RETRY_SCAN" }) },
    retry_auth: { label: "Try payment again", variant: "primary", onClick: () => dispatch({ type: "RETRY_AUTH" }) },
    edit_amount: { label: "Change amount", variant: "secondary", onClick: () => dispatch({ type: "EDIT_AMOUNT" }) },
    status: { label: "Check payment status", variant: "primary", onClick: checkStatus },
    camera: { label: "Try camera again", variant: "primary", onClick: () => { consumeScenario("camera_denied"); camera.retry(); dispatch({ type: "RETRY_SCAN" }); } },
    cancel: { label: "Cancel sale", variant: "ghost", onClick: () => dispatch({ type: "CANCEL" }) },
  };

  return (
    <main className="screen no-nav fail-screen" id="main">
      <div className="fail-mark bad" aria-hidden="true"><Icon name={f.icon} /></div>
      <h1 tabIndex={-1} data-page-title role="alert">{f.title}</h1>
      <p className="small muted" style={{ marginTop: 12 }}>{body}</p>
      <div className="stack">
        {actions.map((a) => (
          <Button key={a} block variant={run[a].variant} loading={a === "status" && checking} onClick={run[a].onClick}>{run[a].label}</Button>
        ))}
      </div>
    </main>
  );
}
