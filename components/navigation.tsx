"use client";

import { cn } from "@/lib/utils";
import { useEffect } from "react";
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
  { id: "analyze", label: "Analyze", to: "/analyze" },
  { id: "jobs", label: "Jobs", to: "/jobs" },
  { id: "resume", label: "Resume", to: "/resume" },
  { id: "settings", label: "Settings", to: "/settings" },
];

export function Navigation({ activeTab = "analyze" }: NavigationProps) {
  const { data: session, isPending: isLoading } = useSession();
  const router = useRouter();

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

      if (nextTab) {
        router.push(nextTab.to);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, router]);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      router.push("/");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <nav className="border-b border-border bg-background animate-enter">
      <div className="flex h-12 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" aria-label="JobMatch — home" className="transition-opacity hover:opacity-70">
            <Logo iconSize={24} />
          </Link>
          <div
            aria-label="Navigation tabs"
            className="flex items-center gap-1"
            role="tablist"
          >
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.to}
                aria-selected={activeTab === tab.id}
                role="tab"
                className={cn(
                  "px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
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

        <div className="flex items-center gap-3">
          <ModeSwitcher />
          {isLoading ? null : session?.user ? (
            <>
              <div
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold"
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
              className="text-sm text-foreground transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              href="/login"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
