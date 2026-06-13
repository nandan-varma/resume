"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  to: number;
  duration?: number;
  className?: string;
}

export function CountUp({ to, duration = 900, className }: CountUpProps) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      // expo-out: starts fast, decelerates to target
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(eased * to));
      if (progress < 1) requestAnimationFrame(tick);
      else setValue(to);
    }

    requestAnimationFrame(tick);
  }, [to, duration]);

  return <span className={className}>{value}</span>;
}
