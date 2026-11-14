import { useRef, useState } from "react";
import { toast } from "@/components/feedback/Toast";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Overlay";
import { useSession } from "@/app/session";
import { useCountUp } from "@/app/useCountUp";
import { cue } from "@/app/feedback";
import { allMethods, MAX_METHODS, RANKS, resolveOrder, type PayMethod } from "@/domain/payment";
import { formatMoney } from "@/domain/money";
import { services } from "@/services/firebase";

const mark = { wallet: "ZM", bank: "BK", card: "CD" } as const;

/** Swipeable carousel of the customer's payment methods in their chosen priority order. */
export function MethodCarousel({ onEdit, badge }: { onEdit: () => void; badge: string }) {
  const { db, market } = useSession();
  const { customer } = db;
  const order = resolveOrder(customer.paymentOrder, customer.sources);
  const balance = useCountUp(customer.balanceMinor);
  const count = order.length + 1; // methods plus the "edit order" slide
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const moved = useRef(false);
  const current = Math.min(index, count - 1);
  const go = (i: number) => setIndex(Math.max(0, Math.min(count - 1, i)));

  function down(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId };
    moved.current = false;
  }
  function move(e: React.PointerEvent) {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (!moved.current) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - s.y)) return;
      moved.current = true;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(s.id);
    }
    // Resist dragging past the first and last slides.
    const atEdge = (dx > 0 && current === 0) || (dx < 0 && current === count - 1);
    setDrag(atEdge ? dx / 4 : dx);
  }
  function up(e: React.PointerEvent) {
    const s = start.current;
    start.current = null;
    if (!s || !moved.current) return;
    const dx = e.clientX - s.x;
    const fast = Math.abs(dx) / Math.max(Date.now() - s.t, 1) > 0.4;
    // However far or fast the swipe, move exactly one slide.
    if (Math.abs(dx) > 50 || (fast && Math.abs(dx) > 15)) go(current + (dx < 0 ? 1 : -1));
    setDrag(0);
    setDragging(false);
  }

  return (
    <section aria-roledescription="carousel" aria-label="Payment methods">
      <div
        className="method-carousel"
        tabIndex={0}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClickCapture={(e) => { if (moved.current) { e.stopPropagation(); e.preventDefault(); moved.current = false; } }}
        onKeyDown={(e) => { if (e.key === "ArrowRight") go(current + 1); if (e.key === "ArrowLeft") go(current - 1); }}
      >
        <div className="method-track" style={{ transform: `translateX(calc(${-current * 100}% - ${current * 12}px + ${drag}px))`, transition: dragging ? "none" : undefined }}>
          {order.map((m, i) => (
            <article key={m.id} className={`method-slide ${m.kind}`} aria-roledescription="slide" aria-label={`${RANKS[i]}: ${m.label}`} aria-hidden={current !== i} data-active={current === i}>
              {i === 0 && <div className="burst" aria-hidden="true">{badge}</div>}
              <p className="eyebrow">{RANKS[i]} · {m.kind === "wallet" ? "Wallet" : m.kind === "bank" ? "Bank account" : "Card"}</p>
              <h2>{m.kind === "wallet" ? formatMoney(balance, market) : m.label}</h2>
              <div className="balance-meta"><span>{m.kind === "wallet" ? "Available balance" : m.detail}</span><span>{market.currency}</span></div>
            </article>
          ))}
          <button type="button" className="method-slide add" onClick={onEdit} aria-label="Edit payment order" data-active={current === count - 1} tabIndex={current === count - 1 ? 0 : -1}>
            <Icon name="settings" />
            <strong>{order.length ? "Edit payment order" : "Choose how you pay"}</strong>
            <span className="small">Up to {MAX_METHODS} methods. If one fails, the next is tried.</span>
          </button>
        </div>
      </div>
      <div className="carousel-dots" role="group" aria-label="Choose slide">
        {Array.from({ length: count }, (_, i) => <button key={i} type="button" aria-label={`Go to slide ${i + 1}`} aria-current={current === i} onClick={() => go(i)} />)}
      </div>
    </section>
  );
}

/** Sheet to choose and reorder up to three payment methods. Changes save immediately. */
export function PaymentOrderSheet({ onClose }: { onClose: () => void }) {
  const { db } = useSession();
  const { sources, paymentOrder } = db.customer;
  const order = resolveOrder(paymentOrder, sources);
  const rest = allMethods(sources).filter((m) => !order.some((o) => o.id === m.id));
  const save = (list: PayMethod[]) => { cue("tap"); services.wallet.setPaymentOrder(list.map((m) => m.id)); };
  const move = (i: number, d: -1 | 1) => {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    save(next);
  };

  return (
    <Sheet title="How you pay" eyebrow="Payment order" onClose={onClose}>
      <p className="small muted" style={{ marginTop: 0 }}>Merchants charge your primary method first. If it can't cover the payment, we try the secondary, then the third.</p>
      <ol className="order-list" aria-label="Payment order">
        {order.map((m, i) => (
          <li key={m.id}>
            <span className="rank">{i + 1}</span>
            <div><strong>{m.label}</strong><p className="small muted" style={{ margin: 0 }}>{RANKS[i]} · {m.detail}</p></div>
            <div className="order-actions">
              <button type="button" aria-label={`Move ${m.label} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" aria-label={`Move ${m.label} down`} disabled={i === order.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button type="button" aria-label={`Remove ${m.label}`} disabled={order.length === 1} onClick={() => save(order.filter((o) => o.id !== m.id))}><Icon name="close" /></button>
            </div>
          </li>
        ))}
      </ol>
      {rest.length > 0 && (
        <>
          <p className="eyebrow" style={{ margin: "16px 0 8px" }}>Available to add</p>
          <ul className="order-list">
            {rest.map((m) => (
              <li key={m.id}>
                <span className="rank dim">{mark[m.kind]}</span>
                <div><strong>{m.label}</strong><p className="small muted" style={{ margin: 0 }}>{m.detail}</p></div>
                <Button variant="secondary" disabled={order.length >= MAX_METHODS} onClick={() => save([...order, m])}>Add</Button>
              </li>
            ))}
          </ul>
        </>
      )}
      {sources.length === 0 && <p className="small muted">Connect a bank account or card in Wallet to add more methods.</p>}
      <div style={{ marginTop: 18 }}><Button block onClick={() => { toast("Payment order saved"); onClose(); }}>Done</Button></div>
    </Sheet>
  );
}
