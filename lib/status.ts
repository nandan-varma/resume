import type { JobStatus } from "@/db/schema";

export const STATUS_CONFIG: Record<JobStatus, { color: string; icon: string }> =
  {
    submitted: { color: "bg-info/10 text-info", icon: "📤" },
    "waiting for response": { color: "bg-warning/10 text-warning", icon: "⏳" },
    rejected: { color: "bg-destructive/10 text-destructive", icon: "❌" },
    interview: { color: "bg-primary/10 text-primary", icon: "🎤" },
    offer: { color: "bg-success/10 text-success", icon: "🎉" },
    accepted: { color: "bg-success/10 text-success", icon: "✅" },
    withdrawn: { color: "bg-muted text-muted-foreground", icon: "🚪" },
  };
