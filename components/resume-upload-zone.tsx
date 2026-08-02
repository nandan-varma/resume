"use client";

import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
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
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    upload.mutate(file, { onSuccess: onUploaded });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    handleFile(file);
  };

  let statusLabel = label;
  if (upload.isPending) {
    statusLabel = "Uploading…";
  } else if (dragActive) {
    statusLabel = "Drop to upload";
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop zone — the nested label + hidden input stay fully keyboard/click accessible on their own
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: same as above
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-border border-dashed",
        "transition-all",
        dragActive && "border-primary bg-primary/10",
        upload.isPending && "pointer-events-none opacity-60",
        className
      )}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragActive(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg transition-colors hover:bg-primary/5">
        {upload.isPending ? (
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        ) : (
          <Upload
            className={cn(
              "size-8 text-muted-foreground",
              dragActive && "text-primary"
            )}
          />
        )}
        <div className="text-center">
          <p className="font-medium text-foreground text-sm">{statusLabel}</p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            PDF only · max 5 MB · drag & drop or click
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
    </div>
  );
}
