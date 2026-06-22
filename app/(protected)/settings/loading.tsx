import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
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
