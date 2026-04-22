import { useCallback, useRef } from 'react';

export function useLongPress(callback: () => void, delay = 600) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);

  const start = useCallback(() => {
    fired.current = false;
    timer.current = window.setTimeout(() => {
      fired.current = true;
      callback();
    }, delay);
  }, [callback, delay]);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    didLongPress: () => fired.current
  };
}
