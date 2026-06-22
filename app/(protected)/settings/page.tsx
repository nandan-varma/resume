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
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <Skeleton className="mb-2 h-9 w-28" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="mb-5 h-[120px]" />
        <Skeleton className="mb-5 h-[100px]" />
        <Skeleton className="h-[200px]" />
      </div>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsContentSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}
