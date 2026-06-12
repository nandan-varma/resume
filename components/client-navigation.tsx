"use client";

import type { Tab } from "@/components/navigation";
import { Navigation } from "@/components/navigation";

interface ClientNavigationProps {
  activeTab?: Tab;
  children: React.ReactNode;
}

export function ClientNavigation({
  children,
  activeTab = "analyze",
}: ClientNavigationProps) {
  return (
    <>
      <Navigation activeTab={activeTab} />
      {children}
    </>
  );
}
