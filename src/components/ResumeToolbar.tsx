import { actions } from "astro:actions";
import { Check, ExternalLink, Printer } from "lucide-react";
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

  const toggleApplied = async () => {
    const next = !applied;
    setApplied(next);
    const { error } = await actions.setApplied({ id, applied: next });
    if (error) {
      setApplied(!next);
      toast.error(error.message);
    }
  };

  return (
    <div className="grid gap-2">
      <Button size="lg" onClick={() => window.print()}>
        <Printer /> Download PDF
      </Button>
      {applyUrl && (
        <Button
          variant="outline"
          onClick={() => window.open(applyUrl, "_blank", "noopener")}
        >
          <ExternalLink /> Open application page
        </Button>
      )}
      <Button
        variant={applied ? "secondary" : "outline"}
        onClick={toggleApplied}
        aria-pressed={applied}
      >
        <Check /> {applied ? "Applied" : "Mark as applied"}
      </Button>
    </div>
  );
}
