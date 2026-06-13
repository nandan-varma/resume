"use client";

import { JobAnalyzer } from "@/components/job-analyzer";
import { Navigation } from "@/components/navigation";
import { AuthGuard } from "@/components/auth-guard";

export default function AnalyzePage() {
  return (
    <AuthGuard>
      <Navigation activeTab="analyze" />
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 animate-enter-up">
            <h1 className="text-3xl font-bold text-foreground">Analyze Match</h1>
            <p className="mt-1 text-muted-foreground">
              See how well your resume fits a job posting
            </p>
          </div>
          <div className="animate-enter-up [animation-delay:80ms]">
            <JobAnalyzer />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
