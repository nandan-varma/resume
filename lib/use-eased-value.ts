"use client";

import { useEffect, useRef, useState } from "react";

export function useEasedValue(
  to: number,
  duration: number,
  ease: (t: number) => number
): number {
  const [value, setValue] = useState(0);
  const easeRef = useRef(ease);
  easeRef.current = ease;

  useEffect(() => {
    const start = performance.now();
    let frameId: number;

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      setValue(t < 1 ? easeRef.current(t) * to : to);
      if (t < 1) {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [to, duration]);

  return value;
}
