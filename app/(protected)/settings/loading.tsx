import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <main className="min-h-screen pt-6 md:pt-10">
      <div className="mx-auto max-w-xl px-6 md:px-10">
        <div className="mb-8">
          <h1 className="font-bold text-3xl text-foreground">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your profile and AI preferences
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-xl px-6 pb-10 md:px-10">
        <Skeleton className="mb-5 h-[120px]" />
        <Skeleton className="mb-5 h-[100px]" />
        <Skeleton className="h-[200px]" />
      </div>
    </main>
  );
}
