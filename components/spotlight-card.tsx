"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.ComponentProps<"div"> {}

export function SpotlightCard({
  children,
  className,
  ...props
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spotlight-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spotlight-y", `${e.clientY - rect.top}px`);
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) {
      return;
    }
    el.style.removeProperty("--spotlight-x");
    el.style.removeProperty("--spotlight-y");
  };

  return (
    <div
      className={cn(
        "spotlight-card relative overflow-hidden border border-border bg-card",
        className
      )}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      ref={ref}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
