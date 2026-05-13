"use client";


import { cn } from "@/lib/utils";
import { useTabNavigation } from "@/lib/use-tab-navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useRef, useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEFAULT_MODEL_ID,
  isValidModelId,
  type Model,
  type ModelId,
  models,
} from "@/lib/models";

export const STORAGE_KEY = "job-match-ai-model";

export type Tab = "analyze" | "jobs" | "resume" | "settings";

interface NavigationProps {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

export function Navigation({
  onTabChange,
  activeTab = "analyze",
}: NavigationProps) {
  const { data: session, isPending: isLoading } = useSession();
  const router = useRouter();
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const [selectedModelId, setSelectedModelId] = useState<ModelId>(() => {
    const stored =
      typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
    if (stored && isValidModelId(stored)) {
      return stored as ModelId;
    }
    return DEFAULT_MODEL_ID;
  });

  const { saveTabPreference } = useTabNavigation<Tab>({
    onTabChange: (tab) => handleTabClick(tab),
    persistTo: "localStorage",
    persistKey: "web-active-tab",
  });

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && isValidModelId(e.newValue)) {
        setSelectedModelId(e.newValue as ModelId);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) {
        return;
      }

      const tabs: Tab[] = ["analyze", "jobs", "resume", "settings"];
      const currentIndex = tabs.indexOf(activeTab);
      let nextTab: Tab | null = null;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextTab = tabs[(currentIndex + 1) % tabs.length];
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      }

      if (nextTab) {
        handleTabClick(nextTab);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab]);

  const handleModelChange = (value: string) => {
    if (isValidModelId(value)) {
      setSelectedModelId(value);
      localStorage.setItem(STORAGE_KEY, value);
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      router.push("/");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleTabClick = (tab: Tab) => {
    saveTabPreference(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const tabs: { id: Tab; label: string; to: string }[] = [
    { id: "analyze", label: "Analyze", to: "/analyze" },
    { id: "jobs", label: "Jobs", to: "/jobs" },
    { id: "resume", label: "Resume", to: "/resume" },
    { id: "settings", label: "Settings", to: "/settings" },
  ];

  return (
    <nav className="border-border border-b bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-foreground text-lg">
            JobMatch
          </span>
          <div
            aria-label="Navigation tabs"
            className="flex items-center gap-1"
            ref={tabContainerRef}
            role="tablist"
          >
            {tabs.map((tab) =>
              true ? (
                onTabChange ? (
                  <button
                    aria-controls={`${tab.id}-panel`}
                    aria-selected={activeTab === tab.id}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      activeTab === tab.id
                        ? "animate-fade-in-up bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    role="tab"
                  >
                    {tab.label}
                  </button>
                ) : (
                  <Link
                    aria-controls={`${tab.id}-panel`}
                    aria-selected={activeTab === tab.id}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      activeTab === tab.id
                        ? "animate-fade-in-up bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    key={tab.id}
                    role="tab"
                    href={tab.to}
                  >
                    {tab.label}
                  </Link>
                )
              ) : null
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <span className="text-muted-foreground text-sm">Loading...</span>
          ) : session?.user ? (
            <>
              <span className="text-muted-foreground text-sm">
                {session.user.email}
              </span>
              <button
                className="rounded px-2 py-1 text-muted-foreground text-sm transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              className="rounded px-2 py-1 text-primary text-sm transition-colors hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary"
              href="/login"
            >
              Sign In
            </Link>
          )}
          <span className="text-muted-foreground text-xs">AI Model:</span>
          <Select onValueChange={handleModelChange} value={selectedModelId}>
            <SelectTrigger className="w-[180px]" size="sm">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {(models as readonly Model[]).map((model: Model) => (
                <SelectItem key={model.id} value={model.id}>
                  <span className="flex flex-col">
                    <span>{model.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {model.provider.toUpperCase()}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </nav>
  );
}
