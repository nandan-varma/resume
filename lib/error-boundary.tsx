"use client";

import { AlertCircle } from "lucide-react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";

function DefaultFallback({
  resetErrorBoundary,
}: {
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex min-h-[200px] items-center justify-center p-6">
      <div className="text-center">
        <AlertCircle className="mx-auto mb-3 size-8 text-muted-foreground/50" />
        <h2 className="mb-1 font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Try refreshing the page.
        </p>
        <Button onClick={resetErrorBoundary} size="sm" variant="outline">
          Try again
        </Button>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary FallbackComponent={DefaultFallback}>
      {children}
    </ReactErrorBoundary>
  );
}
