import { Link } from "@/app/router";
import Icon from "@/components/ui/Icon";

export default function Welcome() {
  return (
    <main className="screen welcome-screen no-nav" id="main">
      <div className="brand-lockup"><img src="/logo.png" alt="" width={36} height={36} style={{ border: "2px solid var(--ink)", borderRadius: 8 }} /><strong>ZEMINE</strong></div>
      <div className="hero-art" aria-hidden="true">
        <div className="orbit one" /><div className="orbit two" />
        <div className="hero-face"><span /><span /></div>
        <b>YOU<br />ARE<br />THE KEY.</b>
      </div>
      <div>
        <p className="eyebrow">Identity, made useful</p>
        <h1 tabIndex={-1} data-page-title>Pay and get paid.<br />Face first.</h1>
        <p className="intro-copy">One enrolled identity for everyday purchases. Customers need no card, cash or phone at the counter. Merchants need only a camera.</p>
        <Link to="/start" className="btn primary block">Get started <span aria-hidden="true">→</span></Link>
        <p className="legal-copy">Pilot programme. Your face is turned into an encrypted template and you can revoke it at any time.</p>
      </div>
    </main>
  );
}
