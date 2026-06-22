import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getQueryClient } from "@/app/get-query-client";
import { SettingsClient } from "@/components/settings-client";
import { Skeleton } from "@/components/ui/skeleton";
import { personalInfoQueryKey } from "@/lib/queries/resume";
import { getPersonalInformation } from "@/server/resume";
import { getSession } from "@/server/session";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your profile and AI analysis preferences.",
};

function SettingsContentSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 md:px-6">
      <Skeleton className="mb-5 h-[88px]" />
      <Skeleton className="mb-5 h-[100px]" />
      <Skeleton className="h-[200px]" />
    </div>
  );
}

export default async function SettingsPage() {
  const queryClient = getQueryClient();
  const [session] = await Promise.all([
    getSession(),
    queryClient.prefetchQuery({
      queryKey: personalInfoQueryKey,
      queryFn: getPersonalInformation,
    }),
  ]);

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
        <HydrationBoundary state={dehydrate(queryClient)}>
          <Suspense fallback={<SettingsContentSkeleton />}>
            <SettingsClient
              userEmail={session?.user.email ?? ""}
              userName={session?.user.name ?? ""}
            />
          </Suspense>
        </HydrationBoundary>
      </div>
    </main>
  );
}
