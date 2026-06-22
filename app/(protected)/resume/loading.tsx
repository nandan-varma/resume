import { Skeleton } from "@/components/ui/skeleton";

export default function ResumeLoading() {
  return (
    <main className="min-h-screen pt-6 md:pt-10">
      <div className="mx-auto max-w-2xl px-6 md:px-10">
        <div className="mb-8">
          <h1 className="font-bold text-3xl text-foreground">Resume</h1>
          <p className="mt-1 text-muted-foreground">
            Your resume is used for all AI analysis
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-6 pb-10 md:px-10">
        <Skeleton className="mb-4 h-[200px]" />
        <Skeleton className="h-[100px]" />
      </div>
    </main>
  );
}
