import { useEffect, useRef } from "react";

/** Runs `run` once each time `current` becomes `target`. Safe under StrictMode's double-invoked effects. */
export function useStepEffect<T>(current: T, target: T, run: () => void) {
  const ran = useRef(false);
  useEffect(() => {
    if (current !== target) {
      ran.current = false;
      return;
    }
    if (ran.current) return;
    ran.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, target]);
}
