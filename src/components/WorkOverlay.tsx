import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export type Step = {
  label: string /** Seconds after the start when this step usually begins. */;
  at: number;
};

type Props = {
  title: string;
  hint?: string;
  steps: Step[];
  /** When the real work has finished: everything completes, then `onDone` runs. */
  done: boolean;
  onDone?: () => void;
};

/** Widths of the lines on the page that "writes itself" while you wait. */
const LINES = [46, 100, 92, 78, 0, 38, 96, 88, 70, 0, 34, 94, 82, 60];

/**
 * A full-screen progress view for the slow, AI-powered steps. It tells you what
 * is happening and roughly how far along it is, so waiting never feels stuck.
 */
export default function WorkOverlay({
  title,
  hint,
  steps,
  done,
  onDone,
}: Props) {
  const [seconds, setSeconds] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);

  // Take focus so the keyboard cannot reach the page underneath.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(
      () => setSeconds((Date.now() - started) / 1000),
      200,
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => onDone?.(), 900);
      return () => clearTimeout(t);
    }
  }, [done, onDone]);

  // Eases toward 94% and never stalls visibly; jumps to 100% when the work ends.
  const progress = done ? 1 : 0.94 * (1 - Math.exp(-seconds / 28));
  const current = done
    ? steps.length
    : steps.reduce((n, s, i) => (seconds >= s.at ? i : n), 0);

  if (typeof document === "undefined") {
    return null;
  }
  return createPortal(
    <div
      ref={dialog}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 outline-none p-4 backdrop-blur-md [animation:fade_0.25s_backwards]"
    >
      <div className="grid w-full max-w-3xl gap-8 rounded-2xl border bg-card p-6 shadow-[var(--shadow-pop)] [animation:pop_0.35s_cubic-bezier(0.2,0.7,0.2,1)_backwards] sm:grid-cols-[11rem_1fr] sm:p-8">
        <div
          className={cn(
            "mx-auto flex aspect-[8.5/11] w-36 flex-col gap-[5px] rounded-md border bg-white p-3 shadow-md transition-transform duration-700 sm:w-full",
            done && "scale-[1.03]",
          )}
          aria-hidden="true"
        >
          {LINES.map((w, i) =>
            w === 0 ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative list
              <span key={`gap-${i}`} className="h-1" />
            ) : (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative list
                key={i}
                className="h-[3px] origin-left rounded-full bg-neutral-300"
                style={{
                  width: `${w}%`,
                  animation: done
                    ? undefined
                    : `write 2.6s cubic-bezier(0.5,0,0.2,1) ${i * 0.16}s infinite alternate`,
                  background: i === 0 ? "#2383e2" : undefined,
                }}
              />
            ),
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-center">
          <h2 className="text-xl font-semibold tracking-tight">
            {done ? "All set" : title}
          </h2>
          <ol className="mt-5 grid gap-3">
            {steps.map((step, i) => {
              const state =
                i < current ? "done" : i === current ? "active" : "todo";
              return (
                <li
                  key={step.label}
                  className={cn(
                    "flex items-center gap-3 transition-all duration-500",
                    state === "todo" && "translate-x-1 opacity-35",
                    state === "active" && "font-medium",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                      state === "done" &&
                        "border-transparent bg-primary text-primary-foreground",
                      state === "active" && "border-primary",
                    )}
                  >
                    {state === "done" ? (
                      <Check
                        className="size-3.5 [animation:pop_0.3s_backwards]"
                        strokeWidth={3}
                      />
                    ) : state === "active" ? (
                      <span className="size-2 rounded-full bg-primary [animation:breathe_1.2s_ease-in-out_infinite]" />
                    ) : null}
                  </span>
                  {step.label}
                </li>
              );
            })}
          </ol>
          <div
            className="mt-6 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          {hint && <p className="mt-3 text-muted-foreground">{hint}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export const TAILOR_STEPS: Step[] = [
  { label: "Reading the job posting", at: 0 },
  { label: "Matching it to your experience", at: 5 },
  { label: "Choosing and sharpening your best points", at: 13 },
  { label: "Fitting everything on one page", at: 24 },
  { label: "Writing your cover letter", at: 34 },
];

export const IMPORT_STEPS: Step[] = [
  { label: "Reading your resume", at: 0 },
  { label: "Finding your jobs, projects and skills", at: 4 },
  { label: "Organizing it into sections", at: 10 },
];
