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
    <div className="mx-auto max-w-xl px-6 pb-10 md:px-10">
      <Skeleton className="mb-5 h-[120px]" />
      <Skeleton className="mb-5 h-[100px]" />
      <Skeleton className="h-[200px]" />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <main className="min-h-screen pt-6 md:pt-10" id="main-content">
      <div className="mx-auto max-w-xl px-6 md:px-10">
        <div className="mb-8 animate-enter-up">
          <h1 className="font-bold text-3xl text-foreground">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your profile and AI preferences
          </p>
        </div>
      </div>
      <Suspense fallback={<SettingsContentSkeleton />}>
        <SettingsContent />
      </Suspense>
    </main>
  );
}
