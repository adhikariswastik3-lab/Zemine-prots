import type { ButtonHTMLAttributes, ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "yellow" | "danger" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export default function Button({ variant = "primary", block, loading, disabled, className = "", children, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`btn ${variant} ${block ? "block" : ""} ${className}`}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, className = "", ...rest }: { icon: IconName; label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-label={label} className={className} {...rest}>
      <Icon name={icon} />
    </button>
  );
}
