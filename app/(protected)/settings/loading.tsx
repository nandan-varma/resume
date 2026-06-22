import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <main className="min-h-screen">
      <div className="border-border/40 border-b px-4 py-5 md:px-6 md:py-6">
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
        <div className="mx-auto max-w-2xl px-4 md:px-6">
          <Skeleton className="mb-5 h-[88px]" />
          <Skeleton className="mb-5 h-[100px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    </main>
  );
}
