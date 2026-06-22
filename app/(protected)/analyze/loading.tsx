import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyzeLoading() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Skeleton className="mb-2 h-9 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[52px] w-full" />
          <Skeleton className="h-[160px] w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </main>
  );
}
