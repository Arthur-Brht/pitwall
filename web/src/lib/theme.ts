import { useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type Theme = "light" | "dark";

// Stored separately from device backups: appearance is a per-device choice.
const KEY = "pitwall-theme";

export function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function useTheme() {
  const [preference, setPreference] =
    useState<ThemePreference>(readThemePreference);
  const [system, setSystem] = useState<Theme>(systemTheme);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!query) return;
    const update = () => setSystem(query.matches ? "light" : "dark");
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const theme: Theme = preference === "system" ? system : preference;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", PALETTE[theme].background);
    try {
      if (preference === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, preference);
    } catch {
      // Appearance still applies for this visit when storage is blocked.
    }
  }, [theme, preference]);
  return { preference, setPreference, theme, colors: PALETTE[theme] };
}

// Chart and map colours mirror the CSS tokens in styles.css.
export const PALETTE = {
  dark: {
    background: "#0f1113",
    grid: "#ffffff10",
    axis: "#7d858c",
    accent: "#d9f26b",
    rain: "#7fb6f0",
    rainRange: "#7fb6f0",
    temperature: "#f2b56b",
    dewpoint: "#8fb3b0",
    wind: "#9db8f5",
    gust: "#c3a4ec",
    trackCasing: "#0f1113",
  },
  light: {
    background: "#f6f6f3",
    grid: "#0000000d",
    axis: "#6b7178",
    accent: "#4f7a0c",
    rain: "#2468d8",
    rainRange: "#2468d8",
    temperature: "#c2620a",
    dewpoint: "#3f7f79",
    wind: "#3256c8",
    gust: "#7a43c7",
    trackCasing: "#ffffff",
  },
} as const;

// Provider colours are tuned for dark surfaces; deeper equivalents keep
// lines readable on white.
const LIGHT_SOURCE: Record<string, string> = {
  "#c8f36b": "#5b8a0e",
  "#70c5fa": "#0b7fc2",
  "#c1a0ff": "#7444d6",
  "#ffb36d": "#d0640d",
  "#eb81b4": "#c9367c",
};
export function sourceColor(color: string, theme: Theme) {
  return theme === "light"
    ? (LIGHT_SOURCE[color.toLowerCase()] ?? color)
    : color;
}
