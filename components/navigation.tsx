"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModeSwitcher } from "@/components/mode-switcher";
import { Logo } from "@/components/logo";
import {
  Menu,
  X,
  LayoutDashboard,
  Sparkles,
  Briefcase,
  FileText,
  Settings,
} from "lucide-react";

export type Tab = "dashboard" | "analyze" | "jobs" | "resume" | "settings";

interface NavigationProps {
  activeTab?: Tab;
}

const tabs: {
  id: Tab;
  label: string;
  to: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}[] = [
  { id: "dashboard", label: "Dashboard", to: "/dashboard", Icon: LayoutDashboard },
  { id: "analyze",   label: "Analyze",   to: "/analyze",   Icon: Sparkles },
  { id: "jobs",      label: "Jobs",       to: "/jobs",      Icon: Briefcase },
  { id: "resume",    label: "Resume",     to: "/resume",    Icon: FileText },
  { id: "settings",  label: "Settings",  to: "/settings",  Icon: Settings },
];

let prevTabId: Tab | null = null;

export function Navigation({ activeTab = "analyze" }: NavigationProps) {
  const { data: session, isPending: isLoading } = useSession();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const tabRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
    visible: boolean;
    animated: boolean;
  }>({ left: 0, width: 0, visible: false, animated: false });

  // Close mobile menu when active tab changes (page navigation)
  useEffect(() => {
    setMobileOpen(false);
  }, [activeTab]);

  // Alt+Arrow keyboard navigation between tabs
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

  // Two-phase indicator: snap to "from" position, then animate to "to" position.
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
        setIndicator({
          left: fromEl.offsetLeft,
          width: fromEl.offsetWidth,
          visible: true,
          animated: false,
        });
        innerRaf = requestAnimationFrame(() => {
          setIndicator({ left: toLeft, width: toWidth, visible: true, animated: true });
        });
      } else {
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
      setMobileOpen(false);
      router.push("/");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const userInitial = session?.user
    ? (session.user.name ?? session.user.email).charAt(0).toUpperCase()
    : null;

  return (
    <nav
      className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm animate-enter"
      aria-label="Site navigation"
    >
      {/* ── Main bar ─────────────────────────────────────────── */}
      <div className="flex h-12 items-stretch justify-between px-4 md:px-6">

        {/* Logo */}
        <Link
          href="/dashboard"
          aria-label="JobMatch — home"
          className="flex items-center transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Logo iconSize={24} />
        </Link>

        {/* Desktop tab list — hidden on mobile */}
        <div
          className="hidden md:flex relative items-stretch gap-0.5"
          aria-label="Main menu"
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
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 size-[4px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-foreground"
            />
          </span>

          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.to}
              aria-current={activeTab === tab.id ? "page" : undefined}
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

        {/* Right controls */}
        <div className="flex items-center gap-2 md:gap-3">
          <ModeSwitcher />

          {!isLoading && session?.user && (
            <>
              {/* Desktop: avatar + sign-out text */}
              <div className="hidden md:flex items-center gap-3">
                <div
                  role="img"
                  aria-label={`Signed in as ${session.user.email}`}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold ring-1 ring-border"
                >
                  {userInitial}
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  Sign out
                </button>
              </div>
              {/* Mobile: avatar (decorative — sign-out is in the mobile menu) */}
              <div
                aria-hidden="true"
                className="md:hidden flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold ring-1 ring-border"
              >
                {userInitial}
              </div>
            </>
          )}

          {!isLoading && !session?.user && (
            <Link
              href="/login"
              className="hidden md:inline-flex text-sm text-foreground transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Sign in
            </Link>
          )}

          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden flex items-center justify-center size-8 -mr-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {mobileOpen
              ? <X className="size-5" aria-hidden="true" />
              : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* ── Mobile dropdown ──────────────────────────────────── */}
      {mobileOpen && (
        <div
          id="mobile-nav-menu"
          className="md:hidden border-t border-border bg-background/95 backdrop-blur-sm"
        >
          <ul className="py-1" role="list">
            {tabs.map(({ id, label, to, Icon }) => (
              <li key={id}>
                <Link
                  href={to}
                  aria-current={activeTab === id ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-ring",
                    activeTab === id
                      ? "text-foreground font-medium bg-muted/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {!isLoading && (
            <div className="border-t border-border px-5 py-3 flex items-center justify-between gap-3 min-w-0">
              {session?.user ? (
                <>
                  <span className="text-xs text-muted-foreground truncate min-w-0">
                    {session.user.email}
                  </span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-foreground hover:text-muted-foreground transition-colors"
                >
                  Sign in
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
