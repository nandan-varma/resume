import { Suspense } from "react";
import { ResumeClient } from "@/components/resume-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getPersonalInformation } from "@/server/resume";

async function ResumeContent() {
  const personalInfo = await getPersonalInformation();
  return (
    <ResumeClient
      initialLatex={personalInfo?.resumeLatex ?? null}
      initialResumeUrl={personalInfo?.resumeUrl ?? null}
    />
  );
}

function ResumeContentSkeleton() {
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

export default function ResumePage() {
  return (
    <Suspense fallback={<ResumeContentSkeleton />}>
      <ResumeContent />
    </Suspense>
  );
}
