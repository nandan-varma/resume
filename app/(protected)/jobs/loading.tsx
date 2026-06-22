import { Skeleton } from "@/components/ui/skeleton";

export default function JobsLoading() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-bold text-3xl text-foreground">Applications</h1>
            <Skeleton className="mt-2 h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-24 shrink-0" />
        </div>
        <div className="mb-6 flex gap-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="space-y-3">
          {["a", "b", "c"].map((id) => (
            <Skeleton className="h-[130px] w-full" key={id} />
          ))}
        </div>
      </div>
    </main>
  );
}
