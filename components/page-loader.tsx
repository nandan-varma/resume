import { Loader2 } from "lucide-react";

interface PageLoaderProps {
  className?: string;
}

export function PageLoader({ className }: PageLoaderProps) {
  return (
    <div className={`flex h-64 items-center justify-center ${className || ""}`}>
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
