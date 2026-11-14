import { useState } from "react";
import { goBack } from "@/app/router";
import { useSession } from "@/app/session";
import { toast } from "@/components/feedback/Toast";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Field, { Segmented } from "@/components/ui/Field";
import { Banner, Badge, EmptyState } from "@/components/ui/Feedback";
import Icon from "@/components/ui/Icon";
import { ConfirmDialog, Sheet } from "@/components/ui/Overlay";
import { formatMoney, major } from "@/domain/money";
import { ServiceError, type FundingSource } from "@/domain/types";
import { services } from "@/services/mock";
import { PaymentOrderSheet } from "@/features/customer/payment/PaymentMethods";
import { resolveOrder, RANKS } from "@/domain/payment";

function TopUpSheet({ onClose }: { onClose: () => void }) {
  const { db, market } = useSession();
  const sources = db.customer.sources;
  const [amount, setAmount] = useState("");
  const [sourceId, setSourceId] = useState(sources.find((s) => s.primary)?.id ?? sources[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = Number(amount);
  const minor = Number.isFinite(value) ? major(value, market) : 0;
  const invalid = !amount || minor < market.minAmountMinor ? `Enter at least ${formatMoney(market.minAmountMinor, market)}` : "";
  const presets = [10, 25, 50, 100].map((v) => v * (market.minorUnits === 0 ? 100 : 1));

  async function submit() {
    if (invalid || !sourceId) return;
    setBusy(true);
    setError(null);
    try {
      await services.wallet.topUp({ amountMinor: minor, sourceId });
      toast(`${formatMoney(minor, market)} added to your balance`);
      onClose();
    } catch (e) {
      setError(e instanceof ServiceError ? e.message : "Top-up failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="Add money" eyebrow="Top up" onClose={onClose}>
      {sources.length === 0 ? (
        <Banner tone="warn" title="Add a funding source first">Connect a bank account or card to top up your balance.</Banner>
      ) : (
        <div className="stack-lg">
          <Field label={`Amount (${market.currency})`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} error={amount ? invalid : undefined} placeholder="0" data-autofocus />
          <div className="filter-row" role="group" aria-label="Quick amounts">
            {presets.map((p) => <button key={p} type="button" className="chip" onClick={() => setAmount(String(p))}>{formatMoney(major(p, market), market)}</button>)}
          </div>
          <div className="field">
            <label htmlFor="source">From</label>
            <select id="source" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              {sources.map((s) => <option key={s.id} value={s.id}>{s.label} ·· {s.last4}</option>)}
            </select>
          </div>
          {error && <Banner tone="error" title="Top-up failed">{error}</Banner>}
          <Button block loading={busy} disabled={!!invalid} onClick={submit}>Add money</Button>
        </div>
      )}
    </Sheet>
  );
}

function AddSourceSheet({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<"bank" | "card">("bank");
  const [label, setLabel] = useState("");
  const [last4, setLast4] = useState("");
  const [touched, setTouched] = useState(false);
  const errs = { label: label.trim().length >= 2 ? "" : "Enter a name for this source", last4: /^\d{4}$/.test(last4) ? "" : "Enter the last 4 digits" };

  function save() {
    setTouched(true);
    if (errs.label || errs.last4) return;
    services.wallet.addSource({ label: label.trim(), kind, last4 });
    toast("Funding source added");
    onClose();
  }

  return (
    <Sheet title="Add funding source" eyebrow="Connect" onClose={onClose}>
      <div className="stack-lg">
        <Segmented label="Source type" value={kind} onChange={setKind} options={[{ value: "bank", label: "Bank account" }, { value: "card", label: "Card" }]} />
        <Field label={kind === "bank" ? "Bank name" : "Card brand"} value={label} onChange={(e) => setLabel(e.target.value)} error={touched ? errs.label : undefined} data-autofocus />
        <Field label="Last 4 digits" inputMode="numeric" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))} error={touched ? errs.last4 : undefined} hint="Prototype only. Never enter a full card number." />
        <Button block onClick={save}>Save source</Button>
      </div>
    </Sheet>
  );
}

export default function Wallet() {
  const { db, market } = useSession();
  const { customer } = db;
  const [sheet, setSheet] = useState<"topup" | "add" | "order" | null>(null);
  const [manage, setManage] = useState<FundingSource | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const current = manage ? customer.sources.find((s) => s.id === manage.id) ?? null : null;

  return (
    <main className="screen" id="main">
      <Header eyebrow="Money sources" title="Wallet & funding" onBack={() => goBack("/customer")} />
      <section className="balance-card" aria-label="Wallet balance">
        <p className="eyebrow">Zemine balance</p>
        <h2>{formatMoney(customer.balanceMinor, market)}</h2>
        <div className="balance-meta"><span>Per-payment limit {formatMoney(customer.limitPerTxMinor, market)}</span><span>{market.currency}</span></div>
      </section>
      <div style={{ marginTop: 18 }}><Button block variant="yellow" onClick={() => setSheet("topup")}><Icon name="plus" className="" />Add money</Button></div>
      <div className="section-title">
        <div><p className="eyebrow">Face payments</p><h3>Payment order</h3></div>
        <button type="button" onClick={() => setSheet("order")}>Edit</button>
      </div>
      <section className="menu-list" style={{ marginTop: 0 }}>
        {resolveOrder(customer.paymentOrder, customer.sources).map((m, i) => (
          <button key={m.id} type="button" onClick={() => setSheet("order")}>
            <span className="menu-number">{i + 1}</span>
            <strong>{m.label} {m.detail}</strong>
            <Badge tone="light">{RANKS[i]}</Badge>
          </button>
        ))}
      </section>
      <div className="section-title">
        <div><p className="eyebrow">Connected</p><h3>Funding sources</h3></div>
        <button type="button" onClick={() => setSheet("add")}>Add new</button>
      </div>
      {customer.sources.length === 0 ? (
        <EmptyState title="No funding sources" action={<div style={{ marginTop: 14 }}><Button onClick={() => setSheet("add")}>Add one</Button></div>}>Connect a bank account or card to add money.</EmptyState>
      ) : (
        <section className="menu-list" style={{ marginTop: 0 }}>
          {customer.sources.map((s) => (
            <button key={s.id} type="button" onClick={() => setManage(s)} aria-label={`${s.label} ending ${s.last4}. Manage`}>
              <span className="menu-number">{s.kind === "bank" ? "BK" : "CD"}</span>
              <strong>{s.label} ·· {s.last4}</strong>
              {s.primary ? <Badge tone="light">Primary</Badge> : <Icon name="arrow" />}
            </button>
          ))}
        </section>
      )}
      <div className="retro-note">
        <p className="eyebrow">You choose how you pay</p>
        <strong>Wallet, bank or card.</strong>
        <p>Pick up to three methods in order. Money is taken only when you approve a payment request, and if one method can't cover it, the next is tried.</p>
      </div>

      {sheet === "topup" && <TopUpSheet onClose={() => setSheet(null)} />}
      {sheet === "order" && <PaymentOrderSheet onClose={() => setSheet(null)} />}
      {sheet === "add" && <AddSourceSheet onClose={() => setSheet(null)} />}
      {current && !confirmRemove && (
        <Sheet title={`${current.label} ·· ${current.last4}`} eyebrow={current.kind === "bank" ? "Bank account" : "Card"} onClose={() => setManage(null)}>
          <div className="stack">
            {!current.primary && <Button block onClick={() => { services.wallet.setPrimarySource(current.id); toast("Primary source updated"); setManage(null); }}>Make primary</Button>}
            <Button variant="danger" block onClick={() => setConfirmRemove(true)}>Remove source</Button>
          </div>
        </Sheet>
      )}
      {current && confirmRemove && (
        <ConfirmDialog title="Remove this source?" body="You can add it again later. Your balance is not affected." confirmLabel="Remove" tone="danger" onCancel={() => setConfirmRemove(false)} onConfirm={() => { services.wallet.removeSource(current.id); setConfirmRemove(false); setManage(null); toast("Funding source removed"); }} />
      )}
    </main>
  );
}
