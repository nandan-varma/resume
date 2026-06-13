"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModeSwitcher } from "@/components/mode-switcher";
import { Logo } from "@/components/logo";

export type Tab = "dashboard" | "analyze" | "jobs" | "resume" | "settings";

interface NavigationProps {
  activeTab?: Tab;
}

const tabs: { id: Tab; label: string; to: string }[] = [
  { id: "dashboard", label: "Dashboard", to: "/dashboard" },
  { id: "analyze",   label: "Analyze",   to: "/analyze" },
  { id: "jobs",      label: "Jobs",       to: "/jobs" },
  { id: "resume",    label: "Resume",     to: "/resume" },
  { id: "settings",  label: "Settings",  to: "/settings" },
];

// Persists across component mounts within the same browser session so the
// indicator can slide *from* the previous tab rather than from position 0.
let prevTabId: Tab | null = null;

export function Navigation({ activeTab = "analyze" }: NavigationProps) {
  const { data: session, isPending: isLoading } = useSession();
  const router = useRouter();

  const tabRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
    visible: boolean;
    animated: boolean;
  }>({ left: 0, width: 0, visible: false, animated: false });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      let nextTab: (typeof tabs)[number] | null = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextTab = tabs[(currentIndex + 1) % tabs.length];
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      }
      if (nextTab) router.push(nextTab.to);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, router]);

  // Two-phase indicator positioning:
  //   Phase 1 (frame N)   — snap to "from" position, no CSS transition
  //   Phase 2 (frame N+1) — animate to "to" position via CSS transition
  // This guarantees the indicator always slides FROM the previous tab,
  // even when the Navigation component remounts on a new page.
  useEffect(() => {
    const toEl = tabRefs.current.get(activeTab);
    if (!toEl) return;

    const fromEl =
      prevTabId !== null && prevTabId !== activeTab
        ? tabRefs.current.get(prevTabId)
        : null;

    let outerRaf: number;
    let innerRaf: number;

    outerRaf = requestAnimationFrame(() => {
      const toLeft  = toEl.offsetLeft;
      const toWidth = toEl.offsetWidth;

      if (fromEl) {
        // Frame N: snap to previous-tab position (visible, no slide)
        setIndicator({
          left: fromEl.offsetLeft,
          width: fromEl.offsetWidth,
          visible: true,
          animated: false,
        });
        // Frame N+1: slide to current-tab position
        innerRaf = requestAnimationFrame(() => {
          setIndicator({ left: toLeft, width: toWidth, visible: true, animated: true });
        });
      } else {
        // First load — just appear at the correct position, no slide
        setIndicator({ left: toLeft, width: toWidth, visible: true, animated: false });
      }

      prevTabId = activeTab;
    });

    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
    };
  }, [activeTab]);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      router.push("/");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm animate-enter">
      <div className="flex h-12 items-stretch justify-between px-6">

        {/* Left — logo + tabs */}
        <div className="flex items-stretch gap-8">
          <Link
            href="/dashboard"
            aria-label="JobMatch — home"
            className="flex items-center transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Logo iconSize={24} />
          </Link>

          {/* Tablist — position:relative so indicator's offsetLeft is relative to this container */}
          <div
            className="relative flex items-stretch gap-0.5"
            role="tablist"
            aria-label="Navigation"
          >
            {/* Sliding indicator */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 h-px bg-foreground"
              style={{
                left: indicator.left,
                width: indicator.width,
                opacity: indicator.visible ? 1 : 0,
                transition: indicator.animated
                  ? "left 350ms cubic-bezier(0.16,1,0.3,1), width 350ms cubic-bezier(0.16,1,0.3,1), opacity 150ms ease"
                  : indicator.visible
                    ? "opacity 150ms ease"
                    : "none",
              }}
            >
              {/* Diamond accent — small rotated square centered on the line */}
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 size-[4px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-foreground"
              />
            </span>

            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.to}
                role="tab"
                aria-selected={activeTab === tab.id}
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el);
                  else tabRefs.current.delete(tab.id);
                }}
                className={cn(
                  "relative flex items-center px-3 text-sm transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  activeTab === tab.id
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right — mode + user */}
        <div className="flex items-center gap-3">
          <ModeSwitcher />
          {isLoading ? null : session?.user ? (
            <>
              <div
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold ring-1 ring-border"
                title={session.user.email}
              >
                {(session.user.name ?? session.user.email).charAt(0).toUpperCase()}
              </div>
              <button
                className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm text-foreground transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Sign in
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}
