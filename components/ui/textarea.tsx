import type * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] duration-200",
        "placeholder:text-muted-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        className
      )}
      data-slot="textarea"
      {...props}
    />
  );
}

export { Textarea };
