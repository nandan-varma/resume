import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyzeLoading() {
  return (
    <main className="min-h-screen">
      <div className="border-border/40 border-b px-4 py-5 md:px-6 md:py-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-bold text-3xl text-foreground tracking-tight">
            Analyze Match
          </h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            See how well your resume fits a job posting
          </p>
        </div>
      </div>
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-[52px] w-full" />
          <Skeleton className="h-[160px] w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </main>
  );
}
