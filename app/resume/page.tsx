"use client";

import { AuthGuard } from "@/components/auth-guard";
import { Navigation } from "@/components/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LatexEditorClient } from "@/components/latex-editor-client";
import { FileText, Upload, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ResumePage() {
  return (
    <AuthGuard>
      <Navigation activeTab="resume" />
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Resume</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your resumes, upload PDFs, and edit LaTeX versions
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="size-6 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">PDF Resume</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Upload and manage your PDF resume. This is used for AI analysis and job matching.
              </p>
              <Link href="/settings">
                <Button className="w-full">
                  Manage PDF Resume
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Upload className="size-6 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">LaTeX Resume</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Edit your LaTeX resume source. Configure a LaTeX runner to compile to PDF.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const el = document.getElementById("latex-editor");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Scroll to Editor
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Card>
          </div>

          <div id="latex-editor" className="mt-8">
            <LatexEditorClient />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
