import { useSyncExternalStore } from "react";

interface ToastItem { id: number; message: string; leaving?: boolean }
let items: ToastItem[] = [];
let counter = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(message: string) {
  const id = ++counter;
  items = [...items, { id, message }];
  emit();
  setTimeout(() => {
    items = items.map((i) => (i.id === id ? { ...i, leaving: true } : i));
    emit();
  }, 3400);
  setTimeout(() => {
    items = items.filter((i) => i.id !== id);
    emit();
  }, 3600);
}

export function ToastHost() {
  const list = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => items,
  );
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {list.map((t) => <div key={t.id} className={`toast ${t.leaving ? "leaving" : ""}`}>{t.message}</div>)}
    </div>
  );
}
