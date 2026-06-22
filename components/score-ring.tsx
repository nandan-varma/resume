"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  className?: string;
  colorClass: string;
  score: number;
  size?: number;
  strokeWidth?: number;
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
      const eased = 1 - (1 - t) ** 3;
      setProgress(eased * score);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setProgress(score);
      }
    }

    requestAnimationFrame(tick);
  }, [score]);

  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0", className)}
      height={size}
      style={{ transform: "rotate(-90deg)" }}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
    >
      {/* Track */}
      <circle
        className="text-border opacity-60"
        cx={cx}
        cy={cy}
        fill="none"
        r={r}
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        className={colorClass}
        cx={cx}
        cy={cy}
        fill="none"
        r={r}
        stroke="currentColor"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="butt"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}
