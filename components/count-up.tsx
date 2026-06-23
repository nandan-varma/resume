"use client";

import { useEasedValue } from "@/lib/use-eased-value";

interface CountUpProps {
  className?: string;
  duration?: number;
  to: number;
}

const expoOut = (t: number) => 1 - 2 ** (-10 * t);

export function CountUp({ to, duration = 900, className }: CountUpProps) {
  const value = useEasedValue(to, duration, expoOut);
  return <span className={className}>{Math.round(value)}</span>;
}
