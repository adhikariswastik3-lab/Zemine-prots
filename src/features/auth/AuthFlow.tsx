import { useEffect, useReducer, useState, type FormEvent } from "react";
import { goBack, navigate } from "@/app/router";
import { useSession } from "@/app/session";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Field, { Segmented, Toggle } from "@/components/ui/Field";
import { Banner } from "@/components/ui/Feedback";
import Icon from "@/components/ui/Icon";
import { demoCode, demoPassword } from "@/config/markets";
import { ServiceError, type Role } from "@/domain/types";
import { services } from "@/services/mock";
import { DEMO_MODE } from "@/config/markets";
import { authReducer, initialAuthState, isEmail, isPhone } from "./authMachine";

export default function AuthFlow({ role }: { role: Role }) {
  const { db, market } = useSession();
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [settlement, setSettlement] = useState("");
  const [deviceBound, setDeviceBound] = useState(false);
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const signup = state.mode === "signup";
  const merchant = role === "merchant";
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  useEffect(() => {
    if (state.step !== "verify" || state.resendIn <= 0) return;
    const t = window.setTimeout(() => dispatch({ type: "TICK" }), 1000);
    return () => window.clearTimeout(t);
  }, [state.step, state.resendIn]);

  const errors = {
    contact: !contact.trim() ? "Enter your " + method : method === "email" ? (isEmail(contact) ? "" : "Enter a valid email, like name@example.com") : isPhone(contact) ? "" : "Enter a valid phone number with country code",
    password: password.length >= 8 ? "" : "Use at least 8 characters",
    name: name.trim().length >= 2 ? "" : "Enter your full legal name",
    business: businessName.trim().length >= 2 ? "" : "Enter your business name",
    settlement: settlement.trim().length >= 6 ? "" : "Enter the account you want payouts sent to",
    code: /^\d{6}$/.test(code) ? "" : "Enter the 6-digit code",
  };

  const fail = (e: unknown) => {
    if (e instanceof ServiceError) dispatch({ type: "FAIL", error: e.message, code: e.code });
    else dispatch({ type: "FAIL", error: "Something went wrong. Try again." });
  };

  async function submitCredentials(e: FormEvent) {
    e.preventDefault();
    setTouched((t) => ({ ...t, contact: true, password: true, name: true }));
    if (errors.contact || errors.password || (signup && errors.name)) return;
    if (signup && merchant) return dispatch({ type: "GO", step: "business" });
    dispatch({ type: "SUBMIT" });
    try {
      const res = signup
        ? await services.auth.signUp({ role, name, contact, password, marketId: db.marketId })
        : await services.auth.signIn({ role, contact, password });
      dispatch({ type: "CHALLENGE", challengeId: res.challengeId });
    } catch (err) {
      fail(err);
    }
  }

  async function submitBusiness(e: FormEvent) {
    e.preventDefault();
    setTouched((t) => ({ ...t, business: true, settlement: true, device: true }));
    if (errors.business || errors.settlement || !deviceBound) return;
    dispatch({ type: "SUBMIT" });
    try {
      const res = await services.auth.signUp({ role, name, contact, password, marketId: db.marketId, businessName, settlementAccount: settlement, deviceBound });
      dispatch({ type: "CHALLENGE", challengeId: res.challengeId });
    } catch (err) {
      fail(err);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    touch("code");
    if (errors.code || !state.challengeId) return;
    dispatch({ type: "SUBMIT" });
    try {
      await services.auth.verifyCode(state.challengeId, code);
      navigate(`/${role}`, { replace: true });
    } catch (err) {
      fail(err);
    }
  }

  async function resend() {
    if (!state.challengeId) return;
    dispatch({ type: "SUBMIT" });
    try {
      await services.auth.resendCode(state.challengeId);
      dispatch({ type: "RESENT" });
    } catch (err) {
      fail(err);
    }
  }

  async function submitReset(e: FormEvent) {
    e.preventDefault();
    touch("contact");
    if (errors.contact) return;
    dispatch({ type: "SUBMIT" });
    try {
      await services.auth.requestReset(contact);
      dispatch({ type: "GO", step: "forgot_sent" });
    } catch (err) {
      fail(err);
    }
  }

  const useDemo = () => {
    setMethod("email");
    setContact(`demo.${role}@zemine.demo`);
    setPassword(demoPassword);
    dispatch({ type: "SET_MODE", mode: "login" });
  };

  const submitting = state.status === "submitting";
  const badge = (
    <div className="account-badge">
      <Icon name={merchant ? "store" : "user"} />
      <span>{merchant ? "Merchant workspace" : "Personal account"} · {market.currency}</span>
    </div>
  );
  const errorBanner = state.error && (
    <Banner tone="error" title={state.errorCode === "offline" ? "You're offline" : "Could not continue"}>
      {state.error}
      {state.errorCode === "locked" && (
        <><br /><button type="button" className="link-button" onClick={() => dispatch({ type: "GO", step: "forgot" })}>Reset password</button></>
      )}
    </Banner>
  );

  if (state.step === "forgot" || state.step === "forgot_sent") {
    return (
      <main className="screen no-nav" id="main">
        <Header eyebrow="Account recovery" title={state.step === "forgot" ? "Reset password." : "Check your inbox."} onBack={() => dispatch({ type: "GO", step: "credentials" })} />
        {state.step === "forgot" ? (
          <form className="stack-lg" onSubmit={submitReset} noValidate>
            <p className="intro-copy">Enter the email or phone number on your account. If it matches, we'll send reset instructions.</p>
            <Field label="Email or phone" value={contact} onChange={(e) => setContact(e.target.value)} onBlur={() => touch("contact")} error={touched.contact ? errors.contact : undefined} autoComplete="username" />
            {errorBanner}
            <Button type="submit" block loading={submitting}>Send reset link</Button>
          </form>
        ) : (
          <div className="stack-lg">
            <Banner tone="success" title="Reset instructions sent">If an account exists for {contact}, you'll receive a link within a few minutes.</Banner>
            <Button block onClick={() => dispatch({ type: "GO", step: "credentials" })}>Back to sign in</Button>
          </div>
        )}
      </main>
    );
  }

  if (state.step === "verify") {
    return (
      <main className="screen no-nav" id="main">
        <Header eyebrow="Verify it's you" title="Enter your code." onBack={() => dispatch({ type: "GO", step: signup && merchant ? "business" : "credentials" })} />
        <form className="stack-lg" onSubmit={submitCode} noValidate>
          <p className="intro-copy">We sent a 6-digit code to <strong>{contact}</strong>. It expires in 10 minutes.</p>
          {DEMO_MODE && <Banner tone="demo" title="Demo mode">Use code <strong>{demoCode}</strong>. No message is actually sent.</Banner>}
          <Field wrapperClassName="code-input" label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} onBlur={() => touch("code")} error={touched.code ? errors.code : undefined} />
          {errorBanner}
          <Button type="submit" block loading={submitting}>Verify and continue</Button>
          <div className="row between">
            <button type="button" className="link-button" disabled={state.resendIn > 0 || submitting} onClick={resend}>Resend code</button>
            <span className="small muted" aria-live="polite">{state.resendIn > 0 ? `Available in ${state.resendIn}s` : "You can resend now"}</span>
          </div>
        </form>
      </main>
    );
  }

  if (state.step === "business") {
    return (
      <main className="screen no-nav" id="main">
        <Header eyebrow="Merchant setup · 2 of 2" title="About your business." onBack={() => dispatch({ type: "GO", step: "credentials" })} />
        {badge}
        <form className="stack-lg" onSubmit={submitBusiness} noValidate>
          <Field label="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} onBlur={() => touch("business")} error={touched.business ? errors.business : undefined} autoComplete="organization" placeholder="Kissa Coffee" />
          <Field label="Payout account" hint={market.settlementLabel} value={settlement} onChange={(e) => setSettlement(e.target.value)} onBlur={() => touch("settlement")} error={touched.settlement ? errors.settlement : undefined} placeholder="Account number" />
          <div>
            <Toggle checked={deviceBound} onChange={(v) => { setDeviceBound(v); touch("device"); }} label="Use this device as a checkout terminal" description="Face payments can only be started from devices you register. You can remove it later in Account." />
            {touched.device && !deviceBound && <span className="field error" role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--text-small)" }}>Register this device to take payments.</span>}
          </div>
          {errorBanner}
          <Button type="submit" block loading={submitting}>Create merchant account</Button>
        </form>
      </main>
    );
  }

  return (
    <main className="screen no-nav" id="main">
      <Header eyebrow="Secure access" title={signup ? "Create account." : "Welcome back."} onBack={() => goBack("/start")} />
      {badge}
      <form className="stack-lg" onSubmit={submitCredentials} noValidate>
        {DEMO_MODE && !signup && (
          <Banner tone="demo" title="Demo mode">
            No real accounts are used. <button type="button" className="link-button" onClick={useDemo}>Fill demo {role} login</button>
          </Banner>
        )}
        <div className="stack">
          <Segmented label="Sign in with" value={method} onChange={(v) => { setMethod(v); setTouched((t) => ({ ...t, contact: false })); }} options={[{ value: "email", label: "Email" }, { value: "phone", label: "Phone" }]} />
          <Field label={method === "email" ? "Email" : "Phone number"} type={method === "email" ? "email" : "tel"} inputMode={method === "email" ? "email" : "tel"} autoComplete="username" placeholder={method === "email" ? "you@example.com" : market.phoneHint} value={contact} onChange={(e) => setContact(e.target.value)} onBlur={() => touch("contact")} error={touched.contact ? errors.contact : undefined} />
          {signup && <Field label="Full legal name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => touch("name")} error={touched.name ? errors.name : undefined} />}
          <Field label="Password" type="password" autoComplete={signup ? "new-password" : "current-password"} placeholder="8+ characters" value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => touch("password")} error={touched.password ? errors.password : undefined} />
        </div>
        {!signup && <button type="button" className="link-button" style={{ justifySelf: "end" }} onClick={() => dispatch({ type: "GO", step: "forgot" })}>Forgot password?</button>}
        {errorBanner}
        <Button type="submit" block loading={submitting}>{signup ? (merchant ? "Continue" : "Create account") : "Sign in"}</Button>
      </form>
      <div className="auth-switch">
        <span>{signup ? "Already registered?" : "New to Zemine?"}</span>
        <button type="button" className="link-button" onClick={() => dispatch({ type: "SET_MODE", mode: signup ? "login" : "signup" })}>{signup ? "Sign in" : "Create account"}</button>
      </div>
      <section className="security-strip">
        <Icon name="shield" />
        <div><strong>Verified sign-in</strong><p>Every sign-in is confirmed with a one-time code.</p></div>
      </section>
    </main>
  );
}
