import { actions } from "astro:actions";
import { Mail, PenLine } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import WorkOverlay, { LETTER_STEPS } from "./WorkOverlay";

type Props = {
  id: string;
  /** A letter already exists: asking again replaces it, so confirm first. */
  hasLetter: boolean;
  /** Receives the new letter; the editor applies it as an undoable edit and autosaves. */
  onLetter: (letter: string) => void;
};

/** Writes the cover letter again, with the same progress view as the first write. */
export default function CoverLetterWriter({ id, hasLetter, onLetter }: Props) {
  const [phase, setPhase] = useState<"idle" | "asking" | "working" | "done">(
    "idle",
  );
  const busy = useRef(false);

  const run = async () => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    setPhase("working");
    try {
      const { data, error } = await actions.writeLetter({ id });
      if (error) {
        throw new Error(error.message);
      }
      onLetter(data.letter);
      setPhase("done");
    } catch (e) {
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : "Something went wrong. Please try again.",
      );
      setPhase("idle");
      busy.current = false;
    }
  };

  if (phase === "asking") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-callout p-2 pl-3 [animation:pop_0.2s_backwards]">
        <span>Replace this letter with a new one?</span>
        <Button size="sm" onClick={run}>
          Yes, write a new one
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPhase("idle")}>
          Keep mine
        </Button>
      </div>
    );
  }

  return (
    <>
      {hasLetter ? (
        <Button variant="ghost" size="sm" onClick={() => setPhase("asking")}>
          <PenLine /> Write it again
        </Button>
      ) : (
        <Button size="lg" onClick={run}>
          <Mail /> Write the cover letter
        </Button>
      )}
      {(phase === "working" || phase === "done") && (
        <WorkOverlay
          title="Writing your cover letter"
          hint="Every fact in it is checked against your resume."
          steps={LETTER_STEPS}
          done={phase === "done"}
          onDone={() => {
            busy.current = false;
            setPhase("idle");
          }}
        />
      )}
    </>
  );
}
