import { actions } from "astro:actions";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";

export default function DeleteResume({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);

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
    <Button
      variant="destructive"
      size="sm"
      className="w-fit"
      onClick={remove}
      onBlur={() => setConfirming(false)}
    >
      <Trash2 /> {confirming ? "Click again to delete" : "Delete this resume"}
    </Button>
  );
}
