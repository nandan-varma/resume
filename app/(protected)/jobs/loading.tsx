import { Skeleton } from "@/components/ui/skeleton";

export default function JobsLoading() {
  return (
    <main className="min-h-screen">
      <div className="border-border/40 border-b px-4 py-5 md:px-6 md:py-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-bold text-3xl text-foreground tracking-tight">
                Applications
              </h1>
              <p className="mt-0.5 text-muted-foreground text-sm">
                Track your job applications
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-5 flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="mb-5 flex gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <div className="space-y-3">
            {["a", "b", "c"].map((id) => (
              <Skeleton className="h-[130px] w-full" key={id} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
