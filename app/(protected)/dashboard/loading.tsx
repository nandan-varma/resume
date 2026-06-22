import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="font-bold text-3xl text-foreground">Welcome back</h1>
          <p className="mt-1 text-muted-foreground">
            Here's your job search at a glance
          </p>
        </div>
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["a", "b", "c", "d"].map((id) => (
            <Skeleton className="h-[90px]" key={id} />
          ))}
        </div>
        <Skeleton className="mb-4 h-5 w-44" />
        <Skeleton className="h-[180px]" />
      </div>
    </main>
  );
}
