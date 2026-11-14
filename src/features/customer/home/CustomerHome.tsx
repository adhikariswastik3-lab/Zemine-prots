import { useEffect, useState } from "react";
import { MethodCarousel, PaymentOrderSheet } from "@/features/customer/payment/PaymentMethods";
import { resolveOrder } from "@/domain/payment";
import { Link } from "@/app/router";
import { cue } from "@/app/feedback";
import { toast } from "@/components/feedback/Toast";
import { Toggle } from "@/components/ui/Field";
import { services } from "@/services/mock";
import { initialsOf, useSession } from "@/app/session";
import Header from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/Feedback";
import Icon from "@/components/ui/Icon";
import { TransactionList } from "@/features/activity/ActivityScreen";
import { formatMoney } from "@/domain/money";

const copy = {
  none: { title: "Set up your face identity", warn: true },
  active: { title: "Face identity is active", warn: false },
  suspended: { title: "Face identity is paused", warn: true },
  revoked: { title: "Face identity was removed", warn: true },
} as const;

export default function CustomerHome() {
  const { db, user, market } = useSession();
  const { customer } = db;
  const [orderOpen, setOrderOpen] = useState(false);
  const status = customer.enrollment.status;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = user?.name.split(" ")[0] ?? "there";
  const today = new Intl.DateTimeFormat(market.locale, { weekday: "short", day: "numeric", month: "short" }).format(new Date());

  const latest = customer.transactions.find((t) => t.kind === "face_payment");
  useEffect(() => {
    if (!latest || Date.now() - new Date(latest.at).getTime() > 120_000) return;
    const key = `zemine.notified.${latest.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    cue("success");
    toast(`Paid ${formatMoney(-latest.amountMinor, market)} to ${latest.counterparty}. Not you? Open Activity to report.`);
  }, [latest, market]);

  const perTx = customer.limitPerTxMinor;
  const maxTx = market.limits.perTransactionMinor;
  const step = 10 ** market.minorUnits;
  const methods = resolveOrder(customer.paymentOrder, customer.sources);
  const lowBalance = status === "active" && methods.length === 1 && methods[0].id === "wallet" && customer.balanceMinor < perTx;

  return (
    <main className="screen" id="main">
      <Header eyebrow={today} title={`${greeting}, ${first}.`} profileHref="/customer/account" initials={initialsOf(user?.name ?? "")} />
      <MethodCarousel onEdit={() => setOrderOpen(true)} badge={status === "active" ? "LIVE" : "SET UP"} />
      <div className="quick-grid">
        <Link to="/customer/wallet" className="btn secondary" style={{ minHeight: 56, justifyContent: "flex-start", fontFamily: "var(--font-mono)", fontSize: "var(--text-small)" }}><Icon name="wallet" className="" /><span>Add money</span></Link>
        <Link to="/customer/enrollment" className="btn secondary" style={{ minHeight: 56, justifyContent: "flex-start", fontFamily: "var(--font-mono)", fontSize: "var(--text-small)" }}><Icon name="face" /><span>Enrollment</span></Link>
      </div>
      {(status === "active" || status === "suspended") && (
        <section className="control-card" aria-label="Face payment controls">
          <Toggle
            label="Allow face payments"
            description={status === "active" ? "Merchants can charge you by face." : "Paused. No one can charge you by face."}
            checked={status === "active"}
            onChange={(on) => { services.biometric.setStatus(on ? "active" : "suspended"); toast(on ? "Face payments resumed" : "Face payments paused"); }}
          />
          <div>
            <div className="row"><label htmlFor="limit-range" className="eyebrow">Per-payment limit</label><strong>{formatMoney(perTx, market)}</strong></div>
            <input id="limit-range" type="range" min={step} max={maxTx} step={step} value={Math.min(perTx, maxTx)} onChange={(e) => services.wallet.setLimit(Number(e.target.value))} aria-valuetext={formatMoney(perTx, market)} />
          </div>
        </section>
      )}
      {lowBalance && (
        <Link to="/customer/wallet" className="identity-status warn" style={{ textDecoration: "none", color: "inherit", marginBottom: 12 }}>
          <div><p className="eyebrow">Low balance</p><strong>Your balance is below your limit. Top up or add a card or bank as backup.</strong></div>
          <Icon name="plus" />
        </Link>
      )}
      <Link to="/customer/enrollment" className={`identity-status ${copy[status].warn ? "warn" : ""}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div>
          <span className={`status-dot ${status === "active" ? "" : "off"}`} />
          <p className="eyebrow">{status === "active" ? "Enrolled" : "Action needed"}</p>
          <strong>{copy[status].title}</strong>
        </div>
        <Icon name="arrow" />
      </Link>
      <div className="section-title">
        <div><p className="eyebrow">Latest</p><h3>Your activity</h3></div>
        <Link to="/customer/activity" className="link-button">See all</Link>
      </div>
      {customer.transactions.length === 0 ? (
        <EmptyState title="No payments yet">Add money and enroll your face to pay at a participating merchant.</EmptyState>
      ) : (
        <TransactionList items={customer.transactions.slice(0, 3)} market={market} />
      )}
      {orderOpen && <PaymentOrderSheet onClose={() => setOrderOpen(false)} />}
    </main>
  );
}
