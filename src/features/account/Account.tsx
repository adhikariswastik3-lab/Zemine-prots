import { useState, type ReactNode } from "react";
import { Link, navigate } from "@/app/router";
import { cue } from "@/app/feedback";
import { setPrefs, usePrefs } from "@/app/prefs";
import { initialsOf, useSession } from "@/app/session";
import { toast } from "@/components/feedback/Toast";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Field, { Toggle } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Feedback";
import Icon, { type IconName } from "@/components/ui/Icon";
import { ConfirmDialog, Sheet } from "@/components/ui/Overlay";
import { formatMoney, major } from "@/domain/money";
import type { Role } from "@/domain/types";
import { services } from "@/services/firebase";
import { updateDb } from "@/services/mock/db";

type SheetName = "prefs" | "limits" | "notifications" | "help" | "store" | "team" | "device" | null;

const faqs = [
  ["How does a face payment work?", "The merchant enters an amount, you approve it on screen, then look at the camera. If it matches your enrolled profile and you have funds, the payment completes."],
  ["Can I pause or remove my face profile?", "Yes. Open Face ID & privacy at any time to pause, re-enroll or remove it. Removing it stops all face payments."],
  ["What if I'm charged twice?", "Contact the merchant for a refund and check your activity. Each payment carries a unique key that prevents duplicate charges."],
];

function Row({ icon, label, tag, to, onClick }: { icon: IconName; label: string; tag?: ReactNode; to?: string; onClick?: () => void }) {
  const inner = (
    <>
      <Icon name={icon} />
      <span>{label}</span>
      {tag ?? <Icon name="arrow" />}
    </>
  );
  return to ? <Link to={to}>{inner}</Link> : <button type="button" onClick={onClick}>{inner}</button>;
}

export default function Account({ role }: { role: Role }) {
  const { db, user, market } = useSession();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newPin, setNewPin] = useState("");
  const prefs = usePrefs();
  const [limit, setLimit] = useState(String(db.customer.limitPerTxMinor / 10 ** market.minorUnits));
  const [store, setStore] = useState(db.merchant.businessName);
  const close = () => setSheet(null);
  const name = user?.name ?? "";
  const maxLimit = market.limits.perTransactionMinor / 10 ** market.minorUnits;
  const limitNum = Number(limit);
  const limitError = !limit || Number.isNaN(limitNum) || limitNum <= 0 ? "Enter an amount above zero" : limitNum > maxLimit ? `Maximum is ${formatMoney(market.limits.perTransactionMinor, market)}` : "";
  const storeError = store.trim().length < 2 ? "Enter your store name" : "";
  const status = db.customer.enrollment.status;

  const pinError = newPin && !/^\d{4}$/.test(newPin) ? "Use exactly 4 digits" : "";

  function deleteFaceData() {
    services.biometric.setStatus("revoked");
    setConfirmDelete(false);
    toast(`Face data deleted. Reference DEL-${Math.floor(100000 + Math.random() * 899999)}`);
  }

  function signOut() {
    services.auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <main className="screen" id="main">
      <Header eyebrow="Account" title="Your profile." />
      <section className="profile-card" aria-label="Profile">
        <div className="profile-face" aria-hidden="true">{initialsOf(name)}</div>
        <div>
          <h2>{role === "merchant" ? db.merchant.businessName : name}</h2>
          <p>{user?.contact}</p>
          <Badge tone="light">{role === "merchant" ? "MERCHANT" : status === "active" ? "FACE ID ACTIVE" : "FACE ID OFF"}</Badge>
        </div>
      </section>

      <nav className="menu-list" aria-label="Account settings">
        {role === "customer" ? (
          <>
            <Row icon="face" label="Face ID & privacy" to="/customer/enrollment" tag={<span className="tag">{status}</span>} />
            <Row icon="wallet" label="Payment methods" to="/customer/wallet" />
            <Row icon="shield" label="Payment limit" onClick={() => setSheet("limits")} tag={<span className="tag">{formatMoney(db.customer.limitPerTxMinor, market)}</span>} />
            <Row icon="alert" label="Notifications" onClick={() => setSheet("notifications")} />
            <Row icon="settings" label="Preferences" onClick={() => setSheet("prefs")} />
            {status !== "none" && status !== "revoked" && <Row icon="close" label="Delete my face data" onClick={() => setConfirmDelete(true)} />}
            <Row icon="plus" label="Help & FAQ" onClick={() => setSheet("help")} />
          </>
        ) : (
          <>
            <Row icon="store" label="Store details" onClick={() => setSheet("store")} />
            <Row icon="wallet" label="Settlements" to="/merchant/settlements" />
            <Row icon="user" label="Team & permissions" onClick={() => setSheet("team")} />
            <Row icon="settings" label="Preferences & staff PIN" onClick={() => setSheet("prefs")} tag={<span className="tag">{prefs.pin ? "PIN on" : "PIN off"}</span>} />
            <Row icon="camera" label="Registered device" onClick={() => setSheet("device")} />
            <Row icon="plus" label="Help & FAQ" onClick={() => setSheet("help")} />
          </>
        )}
      </nav>

      <p className="small muted" style={{ marginBottom: 16 }}>Region: {market.name} · {market.currency}</p>
      <Button block variant="secondary" onClick={() => setConfirmOut(true)}>Sign out</Button>

      {confirmOut && <ConfirmDialog title="Sign out?" body="You'll need to sign in again with a verification code." confirmLabel="Sign out" onConfirm={signOut} onCancel={() => setConfirmOut(false)} />}

      {confirmDelete && <ConfirmDialog title="Delete your face data?" body="Your face template is erased and face payments stop immediately. You can enroll again later." confirmLabel="Delete" tone="danger" onConfirm={deleteFaceData} onCancel={() => setConfirmDelete(false)} />}

      {sheet === "prefs" && (
        <Sheet title="Preferences" onClose={() => { setNewPin(""); close(); }}>
          <div className="stack">
            <Toggle label="Sound" description="Short tones on success and errors" checked={prefs.sound} onChange={(v) => { setPrefs({ sound: v }); if (v) cue("success"); }} />
            <Toggle label="Haptics" description="Vibrate on taps and results" checked={prefs.haptics} onChange={(v) => { setPrefs({ haptics: v }); if (v) cue("tap"); }} />
            <Toggle label="Motion" description="Animations and the scanning effect" checked={prefs.motion} onChange={(v) => setPrefs({ motion: v })} />
            {role === "merchant" && (
              <Toggle
                label="Express face pay"
                description="Automatically charge as soon as customer's face is verified."
                checked={prefs.expressCheckout}
                onChange={(v) => {
                  setPrefs({ expressCheckout: v });
                  toast(v ? "Express face pay enabled" : "Manual confirmation enabled");
                }}
              />
            )}
            {role === "merchant" && (
              <div className="control-card">
                <strong>Staff PIN</strong>
                <p className="small muted" style={{ margin: 0 }}>{prefs.pin ? "Required to start a sale and to refund." : "Set a 4-digit PIN so a shared phone can't take or reverse payments."}</p>
                {!prefs.pin && <Field label="New PIN" inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} error={pinError} />}
                {prefs.pin ? <Button block variant="secondary" onClick={() => { setPrefs({ pin: "" }); toast("PIN removed"); }}>Remove PIN</Button> : <Button block disabled={newPin.length !== 4} onClick={() => { setPrefs({ pin: newPin }); setNewPin(""); toast("PIN set"); }}>Set PIN</Button>}
              </div>
            )}
          </div>
        </Sheet>
      )}

      {sheet === "limits" && (
        <Sheet title="Payment limit" eyebrow="Per payment" onClose={close}>
          <Field label={`Limit (${market.currency})`} inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} error={limitError} hint={`Up to ${formatMoney(market.limits.perTransactionMinor, market)}`} />
          <div style={{ marginTop: 18 }}>
            <Button block disabled={!!limitError} onClick={() => { services.wallet.setLimit(major(limitNum, market)); toast("Payment limit updated"); close(); }}>Save limit</Button>
          </div>
        </Sheet>
      )}

      {sheet === "notifications" && (
        <Sheet title="Notifications" onClose={close}>
          <div className="stack">
            {([
              ["payments", "Payment receipts", "Every time a payment is made"],
              ["security", "Security alerts", "Face ID changes and sign-ins"],
              ["marketing", "News and offers", "Occasional product updates"],
            ] as const).map(([key, label, description]) => (
              <Toggle key={key} label={label} description={description} checked={db.customer.notifications[key]} onChange={(v) => updateDb((d) => { d.customer.notifications[key] = v; })} />
            ))}
          </div>
        </Sheet>
      )}

      {sheet === "help" && (
        <Sheet title="Help & FAQ" onClose={close}>
          <div className="stack">
            {faqs.map(([q, a]) => (
              <details key={q} className="faq">
                <summary><strong>{q}</strong></summary>
                <p className="small muted" style={{ marginTop: 8 }}>{a}</p>
              </details>
            ))}
          </div>
        </Sheet>
      )}

      {sheet === "store" && (
        <Sheet title="Store details" onClose={close}>
          <Field label="Business name" value={store} onChange={(e) => setStore(e.target.value)} error={storeError} />
          <div style={{ marginTop: 18 }}>
            <Button block disabled={!!storeError} onClick={() => { services.wallet.updateBusiness({ businessName: store.trim() }); toast("Store details saved"); close(); }}>Save</Button>
          </div>
        </Sheet>
      )}

      {sheet === "team" && (
        <Sheet title="Team & permissions" onClose={close}>
          <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {db.merchant.team.map((m) => (
              <li key={m.name} className="transaction">
                <div><strong>{m.name}</strong><p className="small muted" style={{ margin: "2px 0 0" }}>{m.role}</p></div>
                <Badge tone={m.canRefund ? "dark" : "light"}>{m.canRefund ? "CAN REFUND" : "SALES ONLY"}</Badge>
              </li>
            ))}
          </ul>
        </Sheet>
      )}

      {sheet === "device" && (
        <Sheet title="Registered device" onClose={close}>
          <p className="small muted">This device is registered for accepting face payments. Only registered devices can start a checkout.</p>
          <div className="detail-list" style={{ marginTop: 14 }}>
            <div><span>Device</span><strong>{typeof navigator !== "undefined" ? navigator.platform || "This device" : "This device"}</strong></div>
            <div><span>Status</span><strong>Registered</strong></div>
          </div>
        </Sheet>
      )}
    </main>
  );
}
