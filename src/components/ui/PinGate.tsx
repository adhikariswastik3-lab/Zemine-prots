import { useEffect, useState } from "react";
import { cue } from "@/app/feedback";
import Button from "@/components/ui/Button";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

/** Four-digit PIN entry. Resolves via onSuccess when `pin` matches, or onSet when `pin` is empty. */
export default function PinGate({ pin, title, hint, onSuccess, onCancel }: { pin: string; title: string; hint?: string; onSuccess: () => void; onCancel?: () => void }) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (value.length < 4) return;
    if (value === pin) {
      cue("success");
      onSuccess();
    } else {
      cue("error");
      setWrong(true);
      setValue("");
    }
  }, [value, pin, onSuccess]);

  function press(k: string) {
    if (k === "") return;
    cue("tap");
    setWrong(false);
    setValue((v) => (k === "back" ? v.slice(0, -1) : (v + k).slice(0, 4)));
  }

  return (
    <div className="pin-gate" role="dialog" aria-modal="true" aria-label={title}>
      <div className="pin-card">
        <p className="eyebrow">Staff PIN</p>
        <h2 tabIndex={-1}>{title}</h2>
        {hint && <p className="small muted">{hint}</p>}
        <div className={`pin-dots ${wrong ? "wrong" : ""}`} role="status" aria-label={`${value.length} of 4 digits entered`}>
          {[0, 1, 2, 3].map((i) => <span key={i} className={i < value.length ? "on" : ""} />)}
        </div>
        <p role="alert" className="small" style={{ minHeight: 20, color: "var(--color-danger)" }}>{wrong ? "Wrong PIN. Try again." : ""}</p>
        <div className="number-pad">
          {keys.map((k, i) => (
            <button key={i} type="button" disabled={k === ""} aria-label={k === "back" ? "Delete last digit" : k || undefined} onClick={() => press(k)} style={k === "" ? { visibility: "hidden" } : undefined}>
              {k === "back" ? "⌫" : k}
            </button>
          ))}
        </div>
        {onCancel && <Button block variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </div>
  );
}
