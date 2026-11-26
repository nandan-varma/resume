import { Toaster as Sonner } from "sonner";

export const Toaster = () => (
  <Sonner
    position="bottom-center"
    toastOptions={{
      style: {
        background: "var(--popover)",
        color: "var(--popover-foreground)",
        border: "none",
        boxShadow: "var(--shadow-pop)",
        borderRadius: "6px",
        fontSize: "14px",
      },
    }}
  />
);
