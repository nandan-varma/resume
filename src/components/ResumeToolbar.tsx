import { actions } from "astro:actions";
import { Check, Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";

type Props = { id: string; applied: boolean; applyUrl: string };

export default function ResumeToolbar({
  id,
  applied: initial,
  applyUrl,
}: Props) {
  const [applied, setApplied] = useState(initial);
  const [confirming, setConfirming] = useState(false);

  const toggleApplied = async () => {
    const next = !applied;
    setApplied(next);
    const { error } = await actions.setApplied({ id, applied: next });
    if (error) {
      setApplied(!next);
      toast.error(error.message);
    }
  };

  const remove = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    const { error } = await actions.deleteApplication({ id });
    if (error) {
      toast.error(error.message);
      return;
    }
    window.location.assign("/resumes");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => window.print()}>
        <Printer /> Download PDF
      </Button>
      {applyUrl && (
        <Button
          variant="outline"
          onClick={() => window.open(applyUrl, "_blank", "noopener")}
        >
          Open application page
        </Button>
      )}
      <Button
        variant={applied ? "secondary" : "outline"}
        onClick={toggleApplied}
        aria-pressed={applied}
      >
        <Check /> {applied ? "Applied" : "Mark as applied"}
      </Button>
      <Button
        variant="ghost"
        className="ml-auto text-destructive"
        onClick={remove}
        onBlur={() => setConfirming(false)}
      >
        <Trash2 /> {confirming ? "Click again to delete" : "Delete"}
      </Button>
    </div>
  );
}
