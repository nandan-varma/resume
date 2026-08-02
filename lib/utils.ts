import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Cmd+Enter (Mac) / Ctrl+Enter (Windows/Linux) — the standard "submit" chord
// for a textarea, where plain Enter is reserved for newlines.
export function isSubmitShortcut(e: { ctrlKey: boolean; key: string; metaKey: boolean }) {
  return (e.metaKey || e.ctrlKey) && e.key === "Enter";
}
