"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "editor-split-pos";

interface ResizablePanelProps {
  defaultLeftPercent?: number;
  left: React.ReactNode;
  minLeft?: number;
  minRight?: number;
  right: React.ReactNode;
}

function loadSaved(defaultValue: number): number {
  if (typeof window === "undefined") {
    return defaultValue;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function ResizablePanel({
  defaultLeftPercent = 50,
  left,
  minLeft = 30,
  minRight = 30,
  right,
}: ResizablePanelProps) {
  const [leftPercent, setLeftPercent] = useState(() =>
    loadSaved(defaultLeftPercent)
  );
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) {
        return;
      }
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();
      let pct = ((e.clientX - rect.left) / rect.width) * 100;
      pct = Math.max(minLeft, Math.min(100 - minRight, pct));
      setLeftPercent(pct);
    };

    const handleMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minLeft, minRight]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(leftPercent));
    } catch {
      // storage unavailable
    }
  }, [leftPercent]);

  return (
    <div className="flex min-h-0 flex-1" ref={containerRef}>
      <div
        className="flex min-h-0 min-w-0"
        style={{ width: `${leftPercent}%` }}
      >
        {left}
      </div>
      <hr
        aria-label="Resize panels"
        aria-valuenow={leftPercent}
        className="mx-0 w-1 shrink-0 cursor-col-resize border-0 bg-border transition-colors hover:bg-primary/50 active:bg-primary"
        onMouseDown={handleMouseDown}
        tabIndex={0}
      />
      <div
        className="flex min-h-0 min-w-0"
        style={{ width: `${100 - leftPercent}%` }}
      >
        {right}
      </div>
    </div>
  );
}
