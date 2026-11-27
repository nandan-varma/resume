import { actions } from "astro:actions";
import { navigate } from "astro:transitions/client";
import { Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { DISCARD_EVENT } from "./useDoc";
import WorkOverlay, { TAILOR_STEPS } from "./WorkOverlay";

type Props = {
  talloId: string;
  shorter?: boolean;
  label?: string;
  variant?: "default" | "outline";
  /** Writing again replaces what is saved, so ask first. */
  confirm?: boolean;
};

export default function TailorButton({
  talloId,
  shorter = false,
  label = "Make my resume",
  variant = "default",
  confirm = false,
}: Props) {
  const [phase, setPhase] = useState<"idle" | "asking" | "working" | "done">(
    "idle",
  );
  const [target, setTarget] = useState<string>();
  const busy = useRef(false);

  const run = async () => {
    // One run at a time, however many times Enter or the button is pressed.
    if (busy.current) {
      return;
    }
    busy.current = true;
    // A new version replaces what is saved, so a pending autosave must not land after it.
    window.dispatchEvent(new Event(DISCARD_EVENT));
    setPhase("working");
    try {
      const { data, error } = await actions.tailor({ talloId, shorter });
      if (error) {
        throw new Error(error.message);
      }
      setTarget(`/resumes/${data.id}?new=1`);
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
      <div className="grid gap-2 rounded-lg border bg-callout p-3 [animation:pop_0.2s_backwards]">
        <p>This replaces your saved resume and any edits you made.</p>
        <div className="flex gap-2">
          <Button onClick={run}>Yes, write a new one</Button>
          <Button variant="ghost" onClick={() => setPhase("idle")}>
            Keep mine
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Button
        size="lg"
        variant={variant}
        className="w-full"
        disabled={phase === "working" || phase === "done"}
        onClick={() => (confirm ? setPhase("asking") : run())}
      >
        <Sparkles /> {label}
      </Button>
      {(phase === "working" || phase === "done") && (
        <WorkOverlay
          title={shorter ? "Tightening your resume" : "Writing your resume"}
          hint="This usually takes 30 to 60 seconds. You can't break anything: your profile stays as it is."
          steps={TAILOR_STEPS}
          done={phase === "done"}
          onDone={() => target && navigate(target)}
        />
      )}
    </>
  );
}
