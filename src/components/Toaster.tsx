import { Toaster as Sonner } from "sonner";

export const Toaster = () => (
  <Sonner
    position="bottom-center"
    toastOptions={{
      style: {
        background: "var(--popover)",
        color: "var(--popover-foreground)",
        border: "1px solid var(--border)",
      },
    }}
  />
);
