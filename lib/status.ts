import type { JobStatus } from "@/db/schema";

export const STATUS_COLORS: Record<JobStatus, string> = {
  submitted: "bg-info/10 text-info",
  "waiting for response": "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
  interview: "bg-primary/10 text-primary",
  offer: "bg-success/10 text-success",
  accepted: "bg-success/10 text-success",
  withdrawn: "bg-muted text-muted-foreground",
};

export const STATUS_ICONS: Record<JobStatus, string> = {
  submitted: "📤",
  "waiting for response": "⏳",
  rejected: "❌",
  interview: "🎤",
  offer: "🎉",
  accepted: "✅",
  withdrawn: "🚪",
};
