import type { ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

export function Banner({ tone = "info", title, children, icon }: { tone?: "info" | "error" | "warn" | "success" | "demo"; title?: string; children?: ReactNode; icon?: IconName }) {
  const defaultIcon: IconName = tone === "error" || tone === "warn" ? "alert" : tone === "success" ? "check" : "shield";
  return (
    <div className={`banner ${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={icon ?? defaultIcon} />
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export function Badge({ tone = "dark", children }: { tone?: "dark" | "light" | "warn" | "bad"; children: ReactNode }) {
  return <span className={`badge ${tone === "dark" ? "" : tone}`}>{children}</span>;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p className="small muted">{children}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ height = 16, width = "100%" }: { height?: number; width?: number | string }) {
  return <div className="skeleton" style={{ height, width }} aria-hidden="true" />;
}
