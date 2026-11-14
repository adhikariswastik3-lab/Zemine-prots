import { Suspense, useEffect, useState } from "react";
import { prefetchRole } from "@/app/prefetch";
import Loader from "@/components/ui/Loader";
import { matchRoute, usePath } from "@/app/router";
import { useSession } from "@/app/session";
import { NotFound, routes, showNavFor } from "@/app/routes";
import { ToastHost } from "@/components/feedback/Toast";
import BottomNav from "@/components/layout/BottomNav";
import DemoControls from "@/features/demo/DemoControls";
import { DEMO_MODE } from "@/config/markets";

/** Shows the loader only if loading takes longer than 150ms, so fast loads never flash. */
function DelayedLoader() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(t);
  }, []);
  return show ? <Loader /> : null;
}

export default function App() {
  const path = usePath();
  const { user } = useSession();
  const route = matchRoute(path, routes);
  const navRole = showNavFor(path);

  const role = user?.role;
  useEffect(() => {
    if (role) prefetchRole(role);
  }, [role]);

  useEffect(() => {
    const target = document.querySelector<HTMLElement>("[data-page-title]") ?? document.getElementById("main");
    target?.focus({ preventScroll: true });
  }, [path]);

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <Suspense fallback={<DelayedLoader />}>{route ? route.element : <NotFound />}</Suspense>
      {user && navRole === user.role && <BottomNav role={navRole} />}
      {DEMO_MODE && <DemoControls />}
      <ToastHost />
      <div className="noise" aria-hidden="true" />
    </div>
  );
}
