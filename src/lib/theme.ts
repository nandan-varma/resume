export type ThemeChoice = "system" | "light" | "dark";

const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

export const savedTheme = (): ThemeChoice => {
  try {
    const value = localStorage.getItem("theme");
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
};

/** Apply and remember a theme. "system" follows the device. */
export const applyTheme = (choice: ThemeChoice) => {
  try {
    if (choice === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", choice);
    }
  } catch {
    // Private browsing: the choice just lasts for this visit.
  }
  const dark = choice === "system" ? systemDark() : choice === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
};
