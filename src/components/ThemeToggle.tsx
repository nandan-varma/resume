import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme } from "@/lib/theme";
import { Button } from "./ui/button";

/** Light or dark in one click. (Settings also offers "match my device".) */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const read = () =>
      setDark(document.documentElement.dataset.theme === "dark");
    read();
    // Settings changes the theme without going through this button.
    const watch = new MutationObserver(read);
    watch.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => watch.disconnect();
  }, []);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => applyTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
