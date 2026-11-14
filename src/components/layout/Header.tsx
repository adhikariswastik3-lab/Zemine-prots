import { Link } from "@/app/router";
import { IconButton } from "@/components/ui/Button";

interface Props {
  eyebrow: string;
  title: string;
  onBack?: () => void;
  profileHref?: string;
  initials?: string;
  showLogo?: boolean;
}

export default function Header({ eyebrow, title, onBack, profileHref, initials, showLogo }: Props) {
  const displayLogo = showLogo ?? !onBack;
  return (
    <header className="page-header">
      {onBack && <IconButton icon="back" label="Go back" className="back-button" onClick={onBack} />}
      {displayLogo && (
        <img
          src="/logo.png"
          alt="Zemine"
          width={36}
          height={36}
          style={{
            borderRadius: 8,
            border: "2px solid var(--color-ink)",
            marginRight: 12,
            flexShrink: 0,
            boxShadow: "2px 2px 0 var(--color-ink)",
          }}
        />
      )}
      <div className="header-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1 tabIndex={-1} data-page-title>{title}</h1>
      </div>
      {profileHref && (
        <Link to={profileHref} className="avatar" aria-label="Open account" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
          {initials}
        </Link>
      )}
    </header>
  );
}
