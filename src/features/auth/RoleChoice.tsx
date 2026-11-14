import { goBack, navigate } from "@/app/router";
import { useSession } from "@/app/session";
import Header from "@/components/layout/Header";
import Icon from "@/components/ui/Icon";
import { marketList } from "@/config/markets";
import { resetDb } from "@/services/mock/db";

export default function RoleChoice() {
  const { db } = useSession();
  return (
    <main className="screen no-nav" id="main">
      <Header eyebrow="Step 1 of 2" title="How will you use Zemine?" onBack={() => goBack("/")} showLogo />
      <p className="intro-copy">Choose a workspace. Customers enroll and manage funds. Merchants accept payments. Each role has its own account.</p>
      <div className="field" style={{ margin: "18px 0 0" }}>
        <label htmlFor="region">Region</label>
        <select id="region" value={db.marketId} onChange={(e) => resetDb(e.target.value, true)}>
          {marketList.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.currency}</option>)}
        </select>
      </div>
      <div className="role-grid">
        <button type="button" onClick={() => navigate("/auth/customer")}>
          <span className="role-icon yellow"><Icon name="user" /></span>
          <p className="eyebrow">For people</p>
          <h2>Personal account</h2>
          <p>Enroll your face, add funds and review every payment.</p>
          <span className="role-link">Continue →</span>
        </button>
        <button type="button" onClick={() => navigate("/auth/merchant")}>
          <span className="role-icon green"><Icon name="store" /></span>
          <p className="eyebrow">For business</p>
          <h2>Merchant account</h2>
          <p>Accept face payments with this device's camera.</p>
          <span className="role-link">Continue →</span>
        </button>
      </div>
    </main>
  );
}
