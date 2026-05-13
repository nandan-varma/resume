"use client";

import { Card } from "@/components/ui/card";

export function LatexEditorClient({ fullScreen }: { fullScreen?: boolean }) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold text-foreground text-lg">
        Resume Editor
      </h2>
      <p className="mb-4 text-muted-foreground">
        LaTeX resume editor - configure your LaTeX runner to enable this
        feature.
      </p>
      <div className="rounded-lg bg-muted p-4">
        <p className="text-muted-foreground text-sm">
          To enable LaTeX compilation, configure your LaTeX runner in the
          settings.
        </p>
      </div>
    </Card>
  );
}
