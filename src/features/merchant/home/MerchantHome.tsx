import { Link, navigate } from "@/app/router";
import { useCountUp } from "@/app/useCountUp";
import { setCheckoutPrefill } from "@/features/merchant/checkout/checkoutMachine";
import { initialsOf, useSession } from "@/app/session";
import Header from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/Feedback";
import Icon from "@/components/ui/Icon";
import { formatMoney } from "@/domain/money";
import { TransactionList } from "@/features/activity/ActivityScreen";

export default function MerchantHome() {
  const { db, user, market } = useSession();
  const { merchant } = db;
  const sales = merchant.transactions.filter((t) => t.kind !== "refund");
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today = merchant.transactions.filter((t) => new Date(t.at) >= startOfDay);
  const todayTotal = today.reduce((sum, t) => sum + t.amountMinor, 0);
  const todaySales = today.filter((t) => t.kind !== "refund").length;
  const lastSale = merchant.transactions.find((t) => t.kind === "face_payment" && t.amountMinor > 0);
  const now = Date.now();
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const from = now - (12 - i) * 3600_000;
    return merchant.transactions.filter((t) => t.amountMinor > 0 && new Date(t.at).getTime() >= from && new Date(t.at).getTime() < from + 3600_000).reduce((s, t) => s + t.amountMinor, 0);
  });
  const peak = Math.max(...buckets, 1);
  const shownTotal = useCountUp(todayTotal);
  const pending = merchant.settlements.find((s) => s.status === "pending");

  return (
    <main className="screen" id="main">
      <Header eyebrow="Merchant" title={merchant.businessName} profileHref="/merchant/account" initials={initialsOf(user?.name ?? merchant.businessName)} />
      <Link to="/merchant/checkout" className="btn primary block" style={{ minHeight: 64, fontSize: "var(--text-body)" }}>
        <Icon name="scan" />
        <span>Accept face payment</span>
      </Link>
      {lastSale && (
        <button type="button" className="btn secondary block" style={{ marginTop: 10 }} onClick={() => { setCheckoutPrefill(lastSale.amountMinor); navigate("/merchant/checkout"); }}>
          <Icon name="clock" />
          <span>Repeat last amount · {formatMoney(lastSale.amountMinor, market)}</span>
        </button>
      )}
      <div className="stats-grid">
        <div>
          <p>TODAY</p>
          <strong>{formatMoney(shownTotal, market)}</strong>
          <div className="sparkline" role="img" aria-label="Takings per hour over the last 12 hours">
            {buckets.map((b, i) => <span key={i} className={b === 0 ? "zero" : ""} style={{ height: `${Math.max(8, (b / peak) * 100)}%` }} />)}
          </div>
        </div>
        <div>
          <p>SALES</p>
          <strong>{todaySales}</strong>
        </div>
      </div>
      {pending && (
        <Link to="/merchant/settlements" className="identity-status" style={{ textDecoration: "none", color: "inherit" }}>
          <div>
            <p className="eyebrow">Next payout</p>
            <strong>{formatMoney(pending.amountMinor, market)}</strong>
          </div>
          <Icon name="arrow" />
        </Link>
      )}
      <div className="section-title">
        <div><p className="eyebrow">Latest</p><h3>Recent sales</h3></div>
        <Link to="/merchant/sales" className="link-button">See all</Link>
      </div>
      {sales.length === 0 ? (
        <EmptyState title="No sales yet" action={<Link to="/merchant/checkout" className="btn secondary">Take your first payment</Link>}>
          Face payments you accept will show up here.
        </EmptyState>
      ) : (
        <TransactionList items={merchant.transactions.slice(0, 4)} market={market} />
      )}
    </main>
  );
}
