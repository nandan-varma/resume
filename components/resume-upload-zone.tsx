"use client";

import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useUploadResume } from "@/lib/queries/resume";
import { cn } from "@/lib/utils";

interface ResumeUploadZoneProps {
  className?: string;
  label: string;
  onUploaded?: (resumeUrl: string) => void;
}

export function ResumeUploadZone({
  className,
  label,
  onUploaded,
}: ResumeUploadZoneProps) {
  const upload = useUploadResume();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    upload.mutate(file, { onSuccess: onUploaded });
  };

  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-border border-dashed",
        "transition-all hover:border-primary/40 hover:bg-primary/5",
        upload.isPending && "pointer-events-none opacity-60",
        className
      )}
    >
      {upload.isPending ? (
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      ) : (
        <Upload className="size-8 text-muted-foreground" />
      )}
      <div className="text-center">
        <p className="font-medium text-foreground text-sm">
          {upload.isPending ? "Uploading…" : label}
        </p>
        <p className="mt-0.5 text-muted-foreground text-xs">
          PDF only · max 5 MB
        </p>
      </div>
      <input
        accept=".pdf"
        className="hidden"
        disabled={upload.isPending}
        onChange={handleChange}
        type="file"
      />
    </label>
  );
}
