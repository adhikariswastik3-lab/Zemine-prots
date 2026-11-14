import { lazy, type ReactNode } from "react";
import { Link, Redirect, type RouteDef } from "@/app/router";
import { useSession } from "@/app/session";
import Icon from "@/components/ui/Icon";
const Account = lazy(() => import("@/features/account/Account"));
const ActivityScreen = lazy(() => import("@/features/activity/ActivityScreen"));
import AuthFlow from "@/features/auth/AuthFlow";
import RoleChoice from "@/features/auth/RoleChoice";
import Welcome from "@/features/auth/Welcome";
const CustomerHome = lazy(() => import("@/features/customer/home/CustomerHome"));
const Enrollment = lazy(() => import("@/features/customer/enrollment/Enrollment"));
const Wallet = lazy(() => import("@/features/customer/wallet/Wallet"));
const Checkout = lazy(() => import("@/features/merchant/checkout/Checkout"));
const MerchantHome = lazy(() => import("@/features/merchant/home/MerchantHome"));
const Settlements = lazy(() => import("@/features/merchant/settlements/Settlements"));
import type { Role } from "@/domain/types";

function Guard({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useSession();
  if (!user) return <Redirect to="/start" />;
  if (user.role !== role) {
    return (
      <main className="screen no-nav fail-screen" id="main">
        <div className="fail-mark bad" aria-hidden="true"><Icon name="shield" /></div>
        <h1 tabIndex={-1} data-page-title role="alert">That's the {role} workspace.</h1>
        <p className="small muted" style={{ marginTop: 12 }}>You're signed in as a {user.role}. {role === "merchant" ? "Only merchants can start face-payment scans." : "Customer tools are only available to customers."}</p>
        <div className="stack"><Link to={`/${user.role}`} className="btn primary block">Go to my {user.role} workspace</Link></div>
      </main>
    );
  }
  return <>{children}</>;
}

function Public({ children }: { children: ReactNode }) {
  const { user } = useSession();
  if (user) return <Redirect to={`/${user.role}`} />;
  return <>{children}</>;
}

export function NotFound() {
  return (
    <main className="screen no-nav fail-screen" id="main">
      <h1 tabIndex={-1} data-page-title>Page not found.</h1>
      <p className="small muted">That address doesn't exist.</p>
      <Link to="/" className="btn primary block">Go to start</Link>
    </main>
  );
}

const customer = (path: string, element: ReactNode): RouteDef => ({ path, element: <Guard role="customer">{element}</Guard> });
const merchant = (path: string, element: ReactNode): RouteDef => ({ path, element: <Guard role="merchant">{element}</Guard> });

export const routes: RouteDef[] = [
  { path: "/", element: <Public><Welcome /></Public> },
  { path: "/start", element: <Public><RoleChoice /></Public> },
  { path: "/auth/customer", element: <Public><AuthFlow role="customer" /></Public> },
  { path: "/auth/merchant", element: <Public><AuthFlow role="merchant" /></Public> },
  customer("/customer", <CustomerHome />),
  customer("/customer/wallet", <Wallet />),
  customer("/customer/activity", <ActivityScreen role="customer" />),
  customer("/customer/enrollment", <Enrollment />),
  customer("/customer/account", <Account role="customer" />),
  merchant("/merchant", <MerchantHome />),
  merchant("/merchant/checkout", <Checkout />),
  merchant("/merchant/sales", <ActivityScreen role="merchant" />),
  merchant("/merchant/settlements", <Settlements />),
  merchant("/merchant/account", <Account role="merchant" />),
];

const hideNav = new Set(["/customer/enrollment", "/merchant/checkout", "/merchant/settlements"]);
export const showNavFor = (path: string): Role | null => {
  if (hideNav.has(path)) return null;
  if (routes.every((r) => r.path !== path)) return null;
  return path.startsWith("/customer") ? "customer" : path.startsWith("/merchant") ? "merchant" : null;
};
