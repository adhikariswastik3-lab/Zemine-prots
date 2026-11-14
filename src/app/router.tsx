import { useEffect, useSyncExternalStore, type AnchorHTMLAttributes, type ReactNode } from "react";

import { flushSync } from "react-dom";

const listeners = new Set<() => void>();

type NavKind = "forward" | "back" | "tab";
const tabRoots = new Set(["/customer", "/customer/wallet", "/customer/activity", "/customer/account", "/merchant", "/merchant/checkout", "/merchant/sales", "/merchant/account"]);

/** Runs a UI update inside a view transition when supported, tagging the direction for CSS. */
function transition(kind: NavKind, update: () => void) {
  const root = document.documentElement;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  const reduce = root.dataset.motion === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.dataset.nav = kind;
  if (reduce || !doc.startViewTransition) return update();
  doc.startViewTransition(() => flushSync(update)).finished.finally(() => { delete root.dataset.nav; });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onPop = () => transition("back", cb);
  window.addEventListener("popstate", onPop);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("popstate", onPop);
  };
}

export const usePath = () => useSyncExternalStore(subscribe, () => window.location.pathname);

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (to === window.location.pathname) return;
  const from = window.location.pathname;
  const kind: NavKind = tabRoots.has(from) && tabRoots.has(to) ? "tab" : "forward";
  try {
    window.history[opts.replace ? "replaceState" : "pushState"](null, "", to);
  } catch {
    /* history unavailable in this sandbox */
  }
  transition(kind, () => listeners.forEach((l) => l()));
  window.scrollTo(0, 0);
}

export const goBack = (fallback: string) => {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback, { replace: true });
};

export function Link({ to, onClick, ...rest }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...rest}
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
    />
  );
}

export function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}

export interface RouteDef {
  path: string;
  element: ReactNode;
}

export function matchRoute(path: string, routes: RouteDef[]): RouteDef | undefined {
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return routes.find((r) => r.path === clean);
}
