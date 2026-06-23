"use client";

import { useEasedValue } from "@/lib/use-eased-value";
import { cn } from "@/lib/utils";

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

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
  const progress = useEasedValue(score, 1300, easeOutCubic);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth * 2 - 2) / 2;
  const circumference = 2 * Math.PI * r;
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
