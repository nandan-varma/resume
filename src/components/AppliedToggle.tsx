import { actions } from "astro:actions";
import { useState } from "react";
import { toast } from "sonner";

export default function AppliedToggle({
  id,
  applied: initial,
}: {
  id: string;
  applied: boolean;
}) {
  const [applied, setApplied] = useState(initial);

  const change = async (checked: boolean) => {
    setApplied(checked);
    const { error } = await actions.setApplied({ id, applied: checked });
    if (error) {
      setApplied(!checked);
      toast.error(error.message);
    }
  };

  return (
    <label className="flex w-fit items-center gap-2 text-muted-foreground">
      <input
        type="checkbox"
        className="size-4 accent-primary"
        checked={applied}
        onChange={(e) => change(e.target.checked)}
      />
      <span className="md:sr-only">Applied</span>
    </label>
  );
}
