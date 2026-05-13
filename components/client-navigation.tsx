"use client";

import type { Tab } from "@/components/navigation";
import { Navigation } from "@/components/navigation";
import { useRouter } from "next/navigation";

interface ClientNavigationProps {
  activeTab?: Tab;
  children: React.ReactNode;
}

export function ClientNavigation({
  children,
  activeTab = "analyze",
}: ClientNavigationProps) {
  const router = useRouter();

  const handleTabChange = (tab: Tab) => {
    router.push(`/${tab}`);
  };

  return (
    <>
      <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
      {children}
    </>
  );
}
