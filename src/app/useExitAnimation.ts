import { useCallback, useRef, useState } from "react";

/** Plays a short exit animation (class "closing") before running the real close handler. */
export function useExitAnimation(onClose: () => void, ms = 160) {
  const [closing, setClosing] = useState(false);
  const done = useRef(false);
  const close = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const reduce = document.documentElement.dataset.motion === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return onClose();
    setClosing(true);
    window.setTimeout(onClose, ms);
  }, [onClose, ms]);
  return { closing, close };
}
