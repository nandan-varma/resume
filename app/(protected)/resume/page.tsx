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
    <div className="mx-auto max-w-2xl px-6 pb-10 md:px-10">
      <Skeleton className="mb-4 h-[200px]" />
      <Skeleton className="h-[100px]" />
    </div>
  );
}

export default function ResumePage() {
  return (
    <main className="min-h-screen pt-6 md:pt-10" id="main-content">
      <div className="mx-auto max-w-2xl px-6 md:px-10">
        <div className="mb-8 animate-enter-up">
          <h1 className="font-bold text-3xl text-foreground">Resume</h1>
          <p className="mt-1 text-muted-foreground">
            Your resume is used for all AI analysis
          </p>
        </div>
      </div>
      <Suspense fallback={<ResumeContentSkeleton />}>
        <ResumeContent />
      </Suspense>
    </main>
  );
}
