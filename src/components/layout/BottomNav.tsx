import { Link, usePath } from "@/app/router";
import Icon, { type IconName } from "@/components/ui/Icon";
import type { Role } from "@/domain/types";

const items: Record<Role, { to: string; label: string; icon: IconName }[]> = {
  customer: [
    { to: "/customer", label: "Home", icon: "home" },
    { to: "/customer/wallet", label: "Wallet", icon: "wallet" },
    { to: "/customer/activity", label: "Activity", icon: "activity" },
    { to: "/customer/account", label: "Account", icon: "user" },
  ],
  merchant: [
    { to: "/merchant", label: "Home", icon: "home" },
    { to: "/merchant/checkout", label: "Take payment", icon: "scan" },
    { to: "/merchant/sales", label: "Sales", icon: "activity" },
    { to: "/merchant/account", label: "Account", icon: "user" },
  ],
};

export default function BottomNav({ role }: { role: Role }) {
  const path = usePath();
  const activeIndex = items[role].findIndex((item) => item.to === path || (item.to.split("/").length > 2 && path.startsWith(item.to)));
  return (
    <nav className="bottom-nav" aria-label={`${role} navigation`} style={{ "--idx": Math.max(activeIndex, 0), "--on": activeIndex >= 0 ? 1 : 0 } as React.CSSProperties}>
      <span className="nav-indicator" aria-hidden="true" />
      {items[role].map((item) => {
        const active = item.to === path || (item.to.split("/").length > 2 && path.startsWith(item.to));
        return (
          <Link key={item.to} to={item.to} className="nav-button" aria-current={active ? "page" : undefined}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
