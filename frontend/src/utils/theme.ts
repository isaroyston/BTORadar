// Light, dark, or follow the system. The choice is stored per browser and applied as
// data-theme on <html>, which index.css reads.
export type ThemeChoice = "auto" | "light" | "dark";

const STORAGE_KEY = "bto-radar:theme";

export function loadTheme(): ThemeChoice {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "auto";
  } catch {
    return "auto";
  }
}

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "auto") delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    if (choice === "auto") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // The choice still applies for this visit.
  }
}

export const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = { auto: "light", light: "dark", dark: "auto" };
export const THEME_LABEL: Record<ThemeChoice, string> = { auto: "Theme: auto", light: "Theme: light", dark: "Theme: dark" };
