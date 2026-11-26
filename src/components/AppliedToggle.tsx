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
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-4 accent-primary"
        checked={applied}
        onChange={(e) => change(e.target.checked)}
      />
      Applied
    </label>
  );
}
