import { useEffect, useId, useRef, type ReactNode } from "react";
import { useExitAnimation } from "@/app/useExitAnimation";
import Button, { IconButton } from "./Button";

function useDialogBehavior(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.querySelector<HTMLElement>("[data-autofocus], input, button, select")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && node) {
        const f = Array.from(node.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select, a[href]"));
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);
  return ref;
}

export function Sheet({ title, eyebrow, onClose, children }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode }) {
  const { closing, close } = useExitAnimation(onClose);
  const ref = useDialogBehavior(close);
  const titleId = useId();
  return (
    <div className={`overlay ${closing ? "closing" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={titleId}>{title}</h2>
          </div>
          <IconButton icon="close" label="Close" className="close-button" onClick={close} />
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, body, confirmLabel, tone = "primary", onConfirm, onCancel, loading }: { title: string; body: string; confirmLabel: string; tone?: "primary" | "danger"; onConfirm: () => void; onCancel: () => void; loading?: boolean }) {
  const { closing, close } = useExitAnimation(onCancel);
  const ref = useDialogBehavior(close);
  const titleId = useId();
  return (
    <div className={`overlay center ${closing ? "closing" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={ref} className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} style={{ fontSize: 24, marginBottom: 10 }}>{title}</h2>
        <p className="small muted" style={{ marginBottom: 20 }}>{body}</p>
        <div className="stack">
          <Button variant={tone === "danger" ? "danger" : "primary"} block loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
          <Button variant="secondary" block data-autofocus onClick={close}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
