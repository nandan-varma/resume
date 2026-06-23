import type { Metadata } from "next";
import { Suspense } from "react";
import { ResumeClient } from "@/components/resume-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getPersonalInformation } from "@/server/resume";

export const metadata: Metadata = {
  title: "Resume",
  description: "Manage your resume for AI analysis.",
};

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
    <div className="mx-auto max-w-6xl px-4 md:px-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-[280px]" />
        <Skeleton className="h-[280px]" />
      </div>
    </div>
  );
}

export default function ResumePage() {
  return (
    <main className="min-h-screen" id="main-content">
      <div className="animate-enter-up border-border/40 border-b px-4 py-5 md:px-6 md:py-6">
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
        <Suspense fallback={<ResumeContentSkeleton />}>
          <ResumeContent />
        </Suspense>
      </div>
    </main>
  );
}
