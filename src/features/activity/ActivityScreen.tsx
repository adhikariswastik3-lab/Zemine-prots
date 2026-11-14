import { useMemo, useState } from "react";
import { usePrefs } from "@/app/prefs";
import PinGate from "@/components/ui/PinGate";
import { toast } from "@/components/feedback/Toast";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import { Banner, EmptyState } from "@/components/ui/Feedback";
import { ConfirmDialog, Sheet } from "@/components/ui/Overlay";
import { useSession } from "@/app/session";
import { formatCompact, formatDateTime, formatMoney, formatRelativeDay } from "@/domain/money";
import { ServiceError, type Role, type Transaction } from "@/domain/types";
import { services } from "@/services/mock";
import type { Market } from "@/config/markets";

export function TransactionRow({ tx, market, onSelect }: { tx: Transaction; market: Market; onSelect?: (tx: Transaction) => void }) {
  const mark = tx.kind === "topup" ? "IN" : tx.kind === "refund" ? "RF" : tx.kind === "qr_payment" ? "QR" : tx.title.slice(0, 2).toUpperCase();
  const fresh = tx.kind === "face_payment" && Date.now() - new Date(tx.at).getTime() < 120_000;
  const body = (
    <>
      <span className="merchant-mark" aria-hidden="true">{mark}</span>
      <div>
        <strong>{tx.title}</strong>
        <p>{tx.counterparty} · {formatRelativeDay(tx.at, market)}{tx.refunded ? " · Refunded" : ""}{tx.reported ? " · Reported" : ""}</p>
      </div>
      <b className={`${tx.amountMinor > 0 ? "positive" : ""} ${tx.refunded ? "refunded" : ""}`}>{formatMoney(tx.amountMinor, market, { signed: true })}</b>
    </>
  );
  return onSelect ? (
    <button type="button" className={`transaction${fresh ? " fresh" : ""}`} onClick={() => onSelect(tx)} aria-label={`${tx.title}, ${formatMoney(tx.amountMinor, market, { signed: true })}. Open details`}>{body}</button>
  ) : (
    <article className={`transaction${fresh ? " fresh" : ""}`}>{body}</article>
  );
}

export function TransactionList({ items, market, onSelect }: { items: Transaction[]; market: Market; onSelect?: (tx: Transaction) => void }) {
  return (
    <div className="transaction-list">
      {items.map((tx) => <TransactionRow key={tx.id} tx={tx} market={market} onSelect={onSelect} />)}
    </div>
  );
}

const filters: Record<Role, { id: string; label: string; test: (t: Transaction) => boolean }[]> = {
  customer: [
    { id: "all", label: "All", test: () => true },
    { id: "pay", label: "In-store", test: (t) => t.kind === "face_payment" },
    { id: "in", label: "Top-ups & refunds", test: (t) => t.kind === "topup" || t.kind === "refund" },
  ],
  merchant: [
    { id: "all", label: "All", test: () => true },
    { id: "face", label: "Face pay", test: (t) => t.kind === "face_payment" },
    { id: "qr", label: "QR", test: (t) => t.kind === "qr_payment" },
    { id: "refunds", label: "Refunds", test: (t) => t.kind === "refund" || !!t.refunded },
  ],
};

function exportCsv(items: Transaction[], market: Market) {
  const rows = [["Date", "Reference", "Type", "Description", "Amount", "Currency"]];
  items.forEach((t) => rows.push([new Date(t.at).toISOString(), t.reference, t.kind, `${t.title} - ${t.counterparty}`, (t.amountMinor / 10 ** market.minorUnits).toFixed(market.minorUnits), market.currency]));
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `zemine-statement-${new Date().toISOString().slice(0, 7)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Statement downloaded");
}

export default function ActivityScreen({ role }: { role: Role }) {
  const { db, user, market } = useSession();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const { pin } = usePrefs();
  const [error, setError] = useState<string | null>(null);

  const all = role === "merchant" ? db.merchant.transactions : db.customer.transactions;
  const active = filters[role].find((f) => f.id === filter) ?? filters[role][0];
  const items = useMemo(() => all.filter(active.test), [all, active]);
  const current = selected ? all.find((t) => t.id === selected.id) ?? selected : null;

  const incoming = all.filter((t) => t.amountMinor > 0 && !t.refunded && t.kind !== "refund" && (role === "merchant" || t.kind === "topup"));
  const totalPositive = incoming.reduce((s, t) => s + t.amountMinor, 0);
  const spend = all.filter((t) => t.kind === "face_payment" && t.amountMinor < 0).reduce((s, t) => s - t.amountMinor, 0);
  const faceCount = all.filter((t) => t.kind === "face_payment").length;

  async function report() {
    if (!current) return;
    setBusy(true);
    try {
      await services.payments.report(current.id);
      toast("Reported. We'll review this payment and contact you.");
    } catch {
      toast("Could not send the report. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function refund() {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      await services.payments.refund(current.id);
      toast("Refund sent to the customer");
      setConfirmRefund(false);
      setSelected(null);
    } catch (e) {
      setError(e instanceof ServiceError ? e.message : "Could not refund. Try again.");
      setConfirmRefund(false);
    } finally {
      setBusy(false);
    }
  }

  const canRefund = role === "merchant" && current && current.kind === "face_payment" && current.amountMinor > 0 && !current.refunded;

  return (
    <main className="screen" id="main">
      <Header eyebrow={role === "merchant" ? "Sales ledger" : "Your money"} title={role === "merchant" ? "Sales" : "Activity"} profileHref={`/${role}/account`} initials={user?.name.slice(0, 2).toUpperCase()} />
      <div className="stats-grid">
        <div><p>{role === "merchant" ? "SALES TOTAL" : "TOTAL SPENT"}</p><strong>{formatCompact(role === "merchant" ? totalPositive : spend, market)}</strong></div>
        <div><p>{role === "merchant" ? "FACE PAYS" : "IN-STORE"}</p><strong>{faceCount}</strong></div>
      </div>
      <div className="filter-row" role="group" aria-label="Filter activity">
        {filters[role].map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>
      {error && <div style={{ marginBottom: 14 }}><Banner tone="error" title="Refund failed">{error}</Banner></div>}
      {items.length === 0 ? (
        <EmptyState title="Nothing here yet">
          {all.length === 0 ? (role === "merchant" ? "Sales appear here after your first face payment." : "Payments and top-ups will appear here.") : "No activity matches this filter."}
        </EmptyState>
      ) : (
        <TransactionList items={items} market={market} onSelect={setSelected} />
      )}
      <div style={{ marginTop: 22 }}>
        <Button variant="ghost" block disabled={all.length === 0} onClick={() => exportCsv(all, market)}>Export statement (CSV)</Button>
      </div>

      {current && (
        <Sheet title={formatMoney(current.amountMinor, market, { signed: true })} eyebrow={current.title} onClose={() => setSelected(null)}>
          <dl className="detail-list">
            <div><dt>Counterparty</dt><dd>{current.counterparty}</dd></div>
            <div><dt>Date</dt><dd>{formatDateTime(current.at, market)}</dd></div>
            {current.via && <div><dt>Paid with</dt><dd>{current.via}</dd></div>}
            <div><dt>Reference</dt><dd>{current.reference}</dd></div>
            <div><dt>Status</dt><dd>{current.refunded ? "Refunded" : "Completed"}</dd></div>
          </dl>
          {role === "customer" && current.kind === "face_payment" && !current.reported && (
            <div style={{ marginBottom: 10 }}><Button variant="danger" block loading={busy} onClick={report}>Not you? Report this payment</Button></div>
          )}
          {canRefund ? <Button variant="danger" block onClick={() => (pin ? setPinOpen(true) : setConfirmRefund(true))}>Refund this sale</Button> : <Button variant="secondary" block onClick={() => setSelected(null)}>Done</Button>}
        </Sheet>
      )}
      {pinOpen && <PinGate pin={pin} title="Enter PIN to refund" onSuccess={() => { setPinOpen(false); setConfirmRefund(true); }} onCancel={() => setPinOpen(false)} />}
      {confirmRefund && current && (
        <ConfirmDialog title="Refund this sale?" body={`${formatMoney(current.amountMinor, market)} goes back to ${current.counterparty}'s balance. This cannot be undone.`} confirmLabel="Refund" tone="danger" loading={busy} onConfirm={refund} onCancel={() => setConfirmRefund(false)} />
      )}
    </main>
  );
}
