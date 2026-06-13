"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  colorClass: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ScoreRing({
  score,
  colorClass,
  size = 88,
  strokeWidth = 3,
  className,
}: ScoreRingProps) {
  const [progress, setProgress] = useState(0);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth * 2 - 2) / 2;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    const start = performance.now();
    const dur = 1300;

    function tick(now: number) {
      const t = Math.min((now - start) / dur, 1);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased * score);
      if (t < 1) requestAnimationFrame(tick);
      else setProgress(score);
    }

    requestAnimationFrame(tick);
  }, [score]);

  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("shrink-0", className)}
      style={{ transform: "rotate(-90deg)" }}
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-border opacity-60"
      />
      {/* Progress arc */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="butt"
        className={colorClass}
      />
    </svg>
  );
}
