import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyzeLoading() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="font-bold text-3xl text-foreground">Analyze Match</h1>
          <p className="mt-1 text-muted-foreground">
            See how well your resume fits a job posting
          </p>
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
