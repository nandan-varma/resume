import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface FormButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
}

export function FormButton({
  loading,
  children,
  disabled,
  ...props
}: FormButtonProps) {
  return (
    <Button disabled={loading || disabled} {...props}>
      {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}
