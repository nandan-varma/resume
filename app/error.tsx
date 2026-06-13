"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="space-y-3 animate-enter-up">
        <h2 className="text-xl font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="text-muted-foreground max-w-sm">
          An unexpected error occurred. You can try again or return to the
          homepage.
        </p>
      </div>
      <div className="flex gap-3 animate-enter-up [animation-delay:80ms]">
        <Button onClick={reset}>Try again</Button>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          Go home
        </Button>
      </div>
    </div>
  );
}
