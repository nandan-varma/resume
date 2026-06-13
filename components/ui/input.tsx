import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-9 w-full min-w-0 border border-input bg-transparent px-3 py-1 text-sm outline-none transition-[border-color,box-shadow] duration-200",
        "placeholder:text-muted-foreground",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        className
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}

export { Input };
