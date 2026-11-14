import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export default function Field({ label, error, hint, wrapperClassName = "", id, ...rest }: Props) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={`field ${wrapperClassName}`} data-invalid={!!error}>
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} aria-invalid={!!error} aria-describedby={describedBy} {...rest} />
      {error ? (
        <span id={`${inputId}-err`} className="error" role="alert">{error}</span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="hint">{hint}</span>
      ) : null}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="segmented">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="check-row">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>{label}</strong>
        {description && <><br /><span className="muted">{description}</span></>}
      </span>
    </label>
  );
}
