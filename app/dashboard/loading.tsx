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
          {["stat-1", "stat-2", "stat-3", "stat-4"].map((id) => (
            <Skeleton className="h-[90px]" key={id} />
          ))}
        </div>
        <Skeleton className="mb-4 h-5 w-44" />
        <Skeleton className="h-[180px]" />
      </div>
    </div>
  );
}
