import { useEffect, useRef, useState } from "react";
import { getPrefs } from "@/app/prefs";

/** Animates a number toward `target` (ease-out). Skips animation when motion is off. */
export function useCountUp(target: number, duration = 500) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const first = useRef(true);

  useEffect(() => {
    const start = first.current ? 0 : from.current;
    first.current = false;
    const reduce = !getPrefs().motion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || start === target) {
      from.current = target;
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(start + (target - start) * eased);
      from.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
