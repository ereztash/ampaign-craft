import { useState, useEffect, useCallback } from "react";
import { safeStorage } from "@/lib/safeStorage";

type DarkModePreference = "light" | "dark" | "system";

const STORAGE_KEY = "funnelforge-dark-mode";

function getSystemPreference(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyDarkClass(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function useDarkMode() {
  const [preference, setPreferenceState] = useState<DarkModePreference>(() => {
    const saved = safeStorage.getString(STORAGE_KEY, "");
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
    return "system";
  });

  const isDark =
    preference === "dark" || (preference === "system" && getSystemPreference());

  useEffect(() => {
    applyDarkClass(isDark);
  }, [isDark]);

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (preference !== "system") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyDarkClass(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((pref: DarkModePreference) => {
    setPreferenceState(pref);
    safeStorage.setString(STORAGE_KEY, pref);
  }, []);

  const toggle = useCallback(() => {
    setPreference(isDark ? "light" : "dark");
  }, [isDark, setPreference]);

  return { preference, setPreference, toggle, isDark };
}
