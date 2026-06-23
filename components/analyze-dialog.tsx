"use client";

import { Sparkles } from "lucide-react";
import { Suspense } from "react";
import { JobAnalyzer } from "@/components/job-analyzer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AnalyzeDialog({ trigger }: { trigger?: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Sparkles className="mr-2 size-4" />
            Analyze Job
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analyze Match</DialogTitle>
        </DialogHeader>
        <Suspense>
          <JobAnalyzer />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
