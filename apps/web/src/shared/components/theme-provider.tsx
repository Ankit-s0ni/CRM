"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

type Theme = "current" | "monochrome";

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: "monochrome",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);
const THEME_CHANGE_EVENT = "deltcrm-theme-change";

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

function readTheme(storageKey: string, defaultTheme: Theme) {
  const storedTheme = localStorage.getItem(storageKey);
  if (storedTheme === "current" || storedTheme === "default") return "current";
  if (storedTheme === "monochrome") return "monochrome";
  return defaultTheme;
}

export function ThemeProvider({
  children,
  defaultTheme = "monochrome",
  storageKey = "deltcrm-ui-theme",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    () => readTheme(storageKey, defaultTheme),
    () => defaultTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;

    if (theme === "monochrome") {
      root.setAttribute("data-theme", "monochrome");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [theme]);

  const value = {
    theme,
    setTheme: (nextTheme: Theme) => {
      localStorage.setItem(storageKey, nextTheme);
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
