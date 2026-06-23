import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CheckCheck,
  Clock,
  Send,
  Sparkles,
  Undo2,
  XCircle,
} from "lucide-react";
import type { JobStatus } from "@/db/schema";

export const STATUS_CONFIG: Record<
  JobStatus,
  { color: string; icon: LucideIcon }
> = {
  submitted: { color: "bg-info/10 text-info", icon: Send },
  "waiting for response": { color: "bg-warning/10 text-warning", icon: Clock },
  rejected: { color: "bg-destructive/10 text-destructive", icon: XCircle },
  interview: { color: "bg-primary/10 text-primary", icon: Calendar },
  offer: { color: "bg-success/10 text-success", icon: Sparkles },
  accepted: { color: "bg-success/10 text-success", icon: CheckCheck },
  withdrawn: { color: "bg-muted text-muted-foreground", icon: Undo2 },
};
