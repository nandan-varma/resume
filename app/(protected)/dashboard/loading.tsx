import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen">
      <div className="border-border/40 border-b px-4 py-5 md:px-6 md:py-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-bold text-3xl text-foreground tracking-tight">
            Welcome back
          </h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Here's your job search at a glance
          </p>
        </div>
      </div>
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {["a", "b", "c", "d"].map((id) => (
              <Skeleton className="h-[90px]" key={id} />
            ))}
          </div>
          <Skeleton className="mb-4 h-5 w-44" />
          <Skeleton className="h-[180px]" />
        </div>
      </div>
    </main>
  );
}
