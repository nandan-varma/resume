import { actions } from "astro:actions";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Spinner } from "./ui/Spinner";

type Props = {
  talloId: string;
  shorter?: boolean;
  label?: string;
  variant?: "default" | "outline";
};

const STEPS = [
  "Reading the job…",
  "Matching it to your details…",
  "Writing your resume…",
  "Almost there…",
];

export default function TailorButton({
  talloId,
  shorter = false,
  label = "Make my resume",
  variant = "default",
}: Props) {
  const [step, setStep] = useState<number | null>(null);

  const running = step !== null;
  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = setInterval(
      () =>
        setStep((s) => (s === null ? s : Math.min(s + 1, STEPS.length - 1))),
      7000,
    );
    return () => clearInterval(timer);
  }, [running]);

  const run = async () => {
    setStep(0);
    const { data, error } = await actions.tailor({ talloId, shorter });
    if (error) {
      toast.error(error.message || "Something went wrong. Please try again.");
      setStep(null);
      return;
    }
    window.location.assign(`/resumes/${data.id}`);
  };

  return (
    <Button
      size="lg"
      variant={variant}
      className="w-full"
      disabled={step !== null}
      onClick={run}
      aria-live="polite"
    >
      {step === null ? <Sparkles /> : <Spinner />}
      {step === null ? label : STEPS[step]}
    </Button>
  );
}
