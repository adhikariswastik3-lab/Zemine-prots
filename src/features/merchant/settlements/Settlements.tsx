import { goBack } from "@/app/router";
import { useSession } from "@/app/session";
import Header from "@/components/layout/Header";
import { Badge, EmptyState } from "@/components/ui/Feedback";
import { formatDateTime, formatMoney } from "@/domain/money";

export default function Settlements() {
  const { db, market } = useSession();
  const list = db.merchant.settlements;
  const next = list.find((s) => s.status === "pending");

  return (
    <main className="screen" id="main">
      <Header eyebrow="Payouts" title="Settlements." onBack={() => goBack("/merchant/account")} />
      {next && (
        <section className="review-total" style={{ marginTop: 0 }} aria-label="Next payout">
          <p className="eyebrow">Next payout</p>
          <h2 style={{ fontSize: 40 }}>{formatMoney(next.amountMinor, market)}</h2>
          <p className="small muted">Scheduled for {formatDateTime(next.date, market)}</p>
        </section>
      )}
      <p className="small muted">Paid to your {market.settlementLabel.toLowerCase()}.</p>
      <div className="section-title"><h3>History</h3></div>
      {list.length === 0 ? (
        <EmptyState title="No payouts yet">Your first payout appears after your first sale.</EmptyState>
      ) : (
        <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {list.map((s) => (
            <li key={s.id} className="transaction">
              <div>
                <strong>{formatMoney(s.amountMinor, market)}</strong>
                <p className="small muted" style={{ margin: "2px 0 0" }}>{formatDateTime(s.date, market)} · {s.reference}</p>
              </div>
              <Badge tone={s.status === "paid" ? "dark" : "warn"}>{s.status === "paid" ? "PAID" : "PENDING"}</Badge>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
