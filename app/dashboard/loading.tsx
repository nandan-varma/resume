import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Skeleton className="mb-2 h-9 w-56" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[90px] " />
          ))}
        </div>
        <Skeleton className="mb-4 h-5 w-44" />
        <Skeleton className="h-[180px] " />
      </div>
    </div>
  );
}
