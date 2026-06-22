"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

interface QuestionBubbleProps {
  answered?: string;
  loading: boolean;
  onPick: (a: string) => void;
  onSkip: () => void;
  options: string[];
  question: string;
}

export function QuestionBubble({
  question,
  options,
  answered,
  loading,
  onPick,
  onSkip,
}: QuestionBubbleProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState("");

  return (
    <div className="max-w-[90%] space-y-2 rounded bg-muted px-2.5 py-2 text-xs">
      <p
        className={
          answered ? "text-muted-foreground" : "font-medium text-foreground"
        }
      >
        {question}
      </p>
      {answered ? (
        <span className="text-primary">→ {answered}</span>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => (
              <button
                className="rounded border border-border px-2.5 py-1 transition-colors hover:border-primary/60 disabled:opacity-50"
                disabled={loading}
                key={opt}
                onClick={() => onPick(opt)}
                type="button"
              >
                {opt}
              </button>
            ))}
          </div>
          {showCustom ? (
            <div className="flex gap-1.5">
              <input
                autoFocus
                className="h-6 flex-1 rounded border border-border bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && custom.trim() && onPick(custom.trim())
                }
                placeholder="Type your answer…"
                value={custom}
              />
              <button
                className="rounded bg-primary px-2 text-primary-foreground disabled:opacity-50"
                disabled={!custom.trim() || loading}
                onClick={() => onPick(custom.trim())}
                type="button"
              >
                OK
              </button>
            </div>
          ) : (
            <div className="flex gap-3 text-muted-foreground">
              <button
                className="underline hover:text-foreground"
                onClick={() => setShowCustom(true)}
                type="button"
              >
                Other…
              </button>
              <button
                className="underline hover:text-foreground"
                disabled={loading}
                onClick={onSkip}
                type="button"
              >
                Skip
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface AssistantBubbleProps {
  content: string;
  editsApplied?: number;
}

export function AssistantBubble({
  content,
  editsApplied,
}: AssistantBubbleProps) {
  return (
    <span className="whitespace-pre-wrap">
      {content}
      {!!editsApplied && (
        <>
          {" "}
          <span className="inline-flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-3 shrink-0" />
            Applied to editor
          </span>
        </>
      )}
    </span>
  );
}

interface LoadingBubbleProps {
  label?: string;
}

export function LoadingBubble({ label = "Thinking…" }: LoadingBubbleProps) {
  return (
    <div className="flex justify-start">
      <span className="inline-flex items-center gap-1.5 rounded bg-muted px-2.5 py-1.5 text-muted-foreground text-xs">
        <Loader2 className="size-3 animate-spin" />
        {label}
      </span>
    </div>
  );
}
