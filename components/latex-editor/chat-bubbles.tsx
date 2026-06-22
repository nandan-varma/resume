"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { memo, useState } from "react";

interface QuestionBubbleProps {
  answered?: string;
  loading: boolean;
  onPick: (a: string) => void;
  onSkip: () => void;
  options: string[];
  question: string;
}

function RawQuestionBubble({
  answered,
  loading,
  onPick,
  onSkip,
  options,
  question,
}: QuestionBubbleProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState("");

  return (
    <div className="max-w-[90%] space-y-2.5 rounded-lg border border-border/60 bg-muted/60 px-3 py-2.5 text-xs">
      <p className="font-medium text-foreground leading-snug">{question}</p>
      {answered ? (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3 shrink-0 text-primary" />
          <span className="font-medium text-primary">{answered}</span>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => (
              <button
                className="rounded-md border border-border bg-background px-2.5 py-1 transition-colors hover:border-primary/60 hover:bg-primary/5 disabled:opacity-50"
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

function RawAssistantBubble({ content, editsApplied }: AssistantBubbleProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="whitespace-pre-wrap leading-relaxed">{content}</span>
      {!!editsApplied && (
        <span className="inline-flex items-center gap-1 font-medium text-green-600 text-xs dark:text-green-400">
          <CheckCircle2 className="size-3 shrink-0" />
          Applied {editsApplied} {editsApplied === 1 ? "change" : "changes"} to
          editor
        </span>
      )}
    </div>
  );
}

interface LoadingBubbleProps {
  label?: string;
}

function RawLoadingBubble({ label = "Thinking…" }: LoadingBubbleProps) {
  return (
    <div className="flex justify-start">
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-muted-foreground text-xs">
        <Loader2 className="size-3 animate-spin" />
        {label}
      </span>
    </div>
  );
}

export const QuestionBubble = memo(RawQuestionBubble);
export const AssistantBubble = memo(RawAssistantBubble);
export const LoadingBubble = memo(RawLoadingBubble);
