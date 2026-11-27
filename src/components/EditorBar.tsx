import { Check, Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./ui/button";
import type { SaveStatus } from "./useDoc";

export function SaveBadge({
  status,
  error,
  retry,
}: {
  status: SaveStatus;
  error: string | null;
  retry: () => void;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs transition-colors duration-300",
        status === "error"
          ? "bg-[var(--callout-red)] text-[var(--tag-red-fg)]"
          : "text-muted-foreground",
      )}
    >
      {status === "saved" && (
        <>
          <Check
            className="size-3.5 text-[var(--tag-green-fg)] [animation:pop_0.3s_backwards]"
            strokeWidth={2.5}
          />{" "}
          Saved
        </>
      )}
      {status === "unsaved" && (
        <>
          <span className="size-1.5 rounded-full bg-muted-foreground" />{" "}
          Editing…
        </>
      )}
      {status === "saving" && (
        <>
          <span className="size-1.5 rounded-full bg-primary [animation:breathe_0.9s_ease-in-out_infinite]" />{" "}
          Saving…
        </>
      )}
      {status === "error" && (
        <>
          {error ?? "Couldn't save."}
          <button
            type="button"
            onClick={retry}
            className="font-medium underline underline-offset-2"
          >
            Try again
          </button>
        </>
      )}
    </span>
  );
}

export function UndoRedo({
  undo,
  redo,
  canUndo,
  canRedo,
}: {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  return (
    <div className="flex">
      <Button
        variant="ghost"
        size="sm"
        onClick={undo}
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo (⌘Z)"
      >
        <Undo2 />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={redo}
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo (⇧⌘Z)"
      >
        <Redo2 />
      </Button>
    </div>
  );
}
