import { Skeleton } from "@/components/ui/skeleton";

export default function ResumeLoading() {
  return (
    <main className="min-h-screen">
      <div className="border-border/40 border-b px-4 py-5 md:px-6 md:py-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-bold text-3xl text-foreground tracking-tight">
            Resume
          </h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Your resume is used for all AI analysis
          </p>
        </div>
      </div>
      <div className="py-6 md:py-8">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <Skeleton className="mb-4 h-[200px]" />
          <Skeleton className="h-[100px]" />
        </div>
      </div>
    </main>
  );
}
