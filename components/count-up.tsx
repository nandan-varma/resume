"use client";

import { useEffect, useState } from "react";

interface CountUpProps {
  className?: string;
  duration?: number;
  to: number;
}

export function CountUp({ to, duration = 900, className }: CountUpProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frameId: number;

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      // expo-out: starts fast, decelerates to target
      const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
      setValue(Math.round(eased * to));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setValue(to);
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [to, duration]);

  return <span className={className}>{value}</span>;
}
