"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";

export function ModeSwitcher() {
  const { setTheme, resolvedTheme } = useTheme();

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return (
    <Button
      className="group/toggle size-8 px-0"
      onClick={toggleTheme}
      variant="ghost"
    >
      <SunIcon className="hidden [html.dark_&]:block transition-transform duration-300 group-hover/toggle:rotate-45" />
      <MoonIcon className="hidden [html.light_&]:block transition-transform duration-300 group-hover/toggle:-rotate-12" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
