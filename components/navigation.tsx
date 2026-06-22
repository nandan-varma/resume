"use client";

import {
  Briefcase,
  FileText,
  LayoutDashboard,
  Menu,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { ModeSwitcher } from "@/components/mode-switcher";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export type Tab = "dashboard" | "analyze" | "jobs" | "resume" | "settings";

interface NavigationProps {
  user: { name: string; email: string } | null;
}

const tabs: {
  id: Tab;
  label: string;
  to: string;
  Icon: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    to: "/dashboard",
    Icon: LayoutDashboard,
  },
  { id: "analyze", label: "Analyze", to: "/analyze", Icon: Sparkles },
  { id: "jobs", label: "Jobs", to: "/jobs", Icon: Briefcase },
  { id: "resume", label: "Resume", to: "/resume", Icon: FileText },
  { id: "settings", label: "Settings", to: "/settings", Icon: Settings },
];

export function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeTab =
    (tabs.find((t) => pathname === t.to || pathname.startsWith(`${t.to}/`))
      ?.id as Tab | undefined) ?? "dashboard";

  const tabRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const prevTabRef = useRef<Tab | null>(null);

  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
    visible: boolean;
    animated: boolean;
  }>({ left: 0, width: 0, visible: false, animated: false });

  // Close mobile menu when active tab changes (page navigation)
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeTab is the trigger dep (not used inside body)
  useEffect(() => {
    setMobileOpen(false);
  }, [activeTab]);

  // Alt+Arrow keyboard navigation between tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) {
        return;
      }
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      let nextTab: (typeof tabs)[number] | null = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextTab = tabs[(currentIndex + 1) % tabs.length];
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      }
      if (nextTab) {
        router.push(nextTab.to);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, router]);

  // Two-phase indicator: snap to "from" position, then animate to "to" position.
  useEffect(() => {
    const toEl = tabRefs.current.get(activeTab);
    if (!toEl) {
      return;
    }

    const fromEl =
      prevTabRef.current !== null && prevTabRef.current !== activeTab
        ? tabRefs.current.get(prevTabRef.current)
        : null;

    let outerRaf: number;
    let innerRaf: number;

    outerRaf = requestAnimationFrame(() => {
      const toLeft = toEl.offsetLeft;
      const toWidth = toEl.offsetWidth;

      if (fromEl) {
        setIndicator({
          left: fromEl.offsetLeft,
          width: fromEl.offsetWidth,
          visible: true,
          animated: false,
        });
        innerRaf = requestAnimationFrame(() => {
          setIndicator({
            left: toLeft,
            width: toWidth,
            visible: true,
            animated: true,
          });
        });
      } else {
        setIndicator({
          left: toLeft,
          width: toWidth,
          visible: true,
          animated: false,
        });
      }

      prevTabRef.current = activeTab;
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

  const userInitial = user
    ? (user.name ?? user.email).charAt(0).toUpperCase()
    : null;

  const indicatorTransition = () => {
    if (indicator.animated) {
      return "left 350ms cubic-bezier(0.16,1,0.3,1), width 350ms cubic-bezier(0.16,1,0.3,1), opacity 150ms ease";
    }
    if (indicator.visible) {
      return "opacity 150ms ease";
    }
    return "none";
  };

  return (
    <nav
      aria-label="Site navigation"
      className="sticky top-0 z-40 animate-enter border-border border-b bg-background/80 backdrop-blur-sm"
    >
      {/* ── Main bar ─────────────────────────────────────────── */}
      <div className="flex h-12 items-stretch justify-between px-4 md:px-6">
        {/* Logo */}
        <Link
          aria-label="JobMatch — home"
          className="flex items-center transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          href="/dashboard"
        >
          <Logo iconSize={24} />
        </Link>

        {/* Desktop tab list — hidden on mobile */}
        {/* biome-ignore lint/a11y/useSemanticElements: nav tab group — fieldset is inappropriate for non-form navigation */}
        <div
          aria-label="Main menu"
          className="relative hidden items-stretch gap-0.5 md:flex"
          role="group"
        >
          {/* Sliding indicator */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 h-px bg-foreground"
            style={{
              left: indicator.left,
              width: indicator.width,
              opacity: indicator.visible ? 1 : 0,
              transition: indicatorTransition(),
            }}
          >
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 size-[4px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-foreground"
            />
          </span>

          {tabs.map((tab) => (
            <Link
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-1.5 px-3 text-sm transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                activeTab === tab.id
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              href={tab.to}
              key={tab.id}
              ref={(el) => {
                if (el) {
                  tabRefs.current.set(tab.id, el);
                } else {
                  tabRefs.current.delete(tab.id);
                }
              }}
            >
              <tab.Icon aria-hidden="true" className="size-3.5 shrink-0" />
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 md:gap-3">
          <ModeSwitcher />

          {user && (
            <>
              {/* Desktop: avatar + sign-out text */}
              <div className="hidden items-center gap-3 md:flex">
                <div
                  aria-label={`Signed in as ${user.email}`}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground font-semibold text-background text-xs ring-1 ring-border"
                  role="img"
                >
                  {userInitial}
                </div>
                <button
                  className="text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onClick={handleSignOut}
                  type="button"
                >
                  Sign out
                </button>
              </div>
              {/* Mobile: avatar (decorative — sign-out is in the mobile menu) */}
              <div
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground font-semibold text-background text-xs ring-1 ring-border md:hidden"
              >
                {userInitial}
              </div>
            </>
          )}

          {!user && (
            <Link
              className="hidden text-foreground text-sm transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:inline-flex"
              href="/login"
            >
              Sign in
            </Link>
          )}

          {/* Hamburger — mobile only */}
          <button
            aria-controls="mobile-nav-menu"
            aria-expanded={mobileOpen}
            aria-label={
              mobileOpen ? "Close navigation menu" : "Open navigation menu"
            }
            className="-mr-1 flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            type="button"
          >
            {mobileOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile dropdown ──────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="border-border border-t bg-background/95 backdrop-blur-sm md:hidden"
          id="mobile-nav-menu"
        >
          <ul className="py-1">
            {tabs.map(({ id, label, to, Icon }) => (
              <li key={id}>
                <Link
                  aria-current={activeTab === id ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset",
                    activeTab === id
                      ? "bg-muted/50 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  )}
                  href={to}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex min-w-0 items-center justify-between gap-3 border-border border-t px-5 py-3">
            {user ? (
              <>
                <span className="min-w-0 truncate text-muted-foreground text-xs">
                  {user.email}
                </span>
                <button
                  className="shrink-0 text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onClick={handleSignOut}
                  type="button"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                className="text-foreground text-sm transition-colors hover:text-muted-foreground"
                href="/login"
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
