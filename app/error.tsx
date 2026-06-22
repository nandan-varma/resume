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
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center"
      id="main-content"
    >
      <div className="animate-enter-up space-y-3">
        <h2 className="font-semibold text-foreground text-xl">
          Something went wrong
        </h2>
        <p className="max-w-sm text-muted-foreground">
          An unexpected error occurred. You can try again or return to the
          homepage.
        </p>
      </div>
      <div className="flex animate-enter-up gap-3 [animation-delay:80ms]">
        <Button onClick={reset}>Try again</Button>
        <Button
          onClick={() => {
            window.location.href = "/";
          }}
          variant="outline"
        >
          Go home
        </Button>
      </div>
    </main>
  );
}
