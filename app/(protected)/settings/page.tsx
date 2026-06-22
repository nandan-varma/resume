import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsClient } from "@/components/settings-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getPersonalInformation } from "@/server/resume";
import { getSession } from "@/server/session";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your profile and AI analysis preferences.",
};

async function SettingsContent() {
  const [session, personalInfo] = await Promise.all([
    getSession(),
    getPersonalInformation(),
  ]);
  return (
    <SettingsClient
      initialPreferences={personalInfo?.aiPreferences ?? ""}
      userEmail={session?.user.email ?? ""}
      userName={session?.user.name ?? ""}
    />
  );
}

function SettingsContentSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 md:px-6">
      <Skeleton className="mb-5 h-[88px]" />
      <Skeleton className="mb-5 h-[100px]" />
      <Skeleton className="h-[200px]" />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <main className="min-h-screen" id="main-content">
      <div className="animate-enter-up border-border/40 border-b px-4 py-5 md:px-6 md:py-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-bold text-3xl text-foreground tracking-tight">
            Settings
          </h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Manage your profile and AI preferences
          </p>
        </div>
      </div>
      <div className="py-6 md:py-8">
        <Suspense fallback={<SettingsContentSkeleton />}>
          <SettingsContent />
        </Suspense>
      </div>
    </main>
  );
}
