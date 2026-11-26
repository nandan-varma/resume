import { actions } from "astro:actions";
import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Spinner } from "./ui/Spinner";

export default function ImportResume() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    const { error } = await actions.importResume(form);
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    toast.success("Done! Check the details below.");
    window.location.reload();
  };

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <Button size="lg" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Spinner /> : <FileUp />}
        {busy ? "Reading your resume…" : "Upload a PDF resume"}
      </Button>
      <p className="mt-2 text-sm text-muted-foreground">
        We read it once to fill in the form. The file itself is not kept.
      </p>
    </div>
  );
}
