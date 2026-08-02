export function EditorSkeleton() {
  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-border border-b px-4">
        <div className="flex items-center gap-4">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-px bg-border" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex-1 animate-pulse bg-muted/30" />
        <div className="w-1 bg-border" />
        <div className="flex-1 animate-pulse bg-muted/20" />
      </div>
    </div>
  );
}
