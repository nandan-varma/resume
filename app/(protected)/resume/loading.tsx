import { Skeleton } from "@/components/ui/skeleton";

export default function ResumeLoading() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Skeleton className="mb-2 h-9 w-28" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="mb-4 h-[200px]" />
        <Skeleton className="h-[100px]" />
      </div>
    </main>
  );
}
