"use client";

import { JobAnalyzer } from "@/components/job-analyzer";
import { Card } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { AuthGuard } from "@/components/auth-guard";

export default function AnalyzePage() {
  return (
    <AuthGuard>
      <Navigation activeTab="analyze" />
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Resume Analyzer
            </h1>
            <p className="mt-2 text-muted-foreground">
              Analyze how well your resume matches job descriptions using AI
            </p>
          </div>

          <Card className="p-6 md:p-8">
            <JobAnalyzer />
          </Card>

          <Card className="mt-8 border-primary/20 bg-primary/10 p-6">
            <h3 className="font-semibold text-primary">How it works</h3>
            <ul className="mt-3 space-y-2 text-sm text-primary">
              <li>
                • Paste a job description or provide a URL to the job posting
              </li>
              <li>
                • Our AI analyzes your resume against the job requirements
              </li>
              <li>
                • Get insights on match percentage, missing keywords, and
                suggestions for improvement
              </li>
              <li>• Analysis results are saved to your account for future reference</li>
            </ul>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
