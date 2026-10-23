"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const initialTheme: Theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const currentTheme = theme ?? (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    const nextTheme: Theme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    try { window.localStorage.setItem("rscj-theme", nextTheme); } catch { /* The visual toggle still works if storage is blocked. */ }
    setTheme(nextTheme);
  }

  const dark = theme === "dark";
  return <button type="button" className={`theme-toggle ${className}`.trim()} onClick={toggleTheme}
    aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={dark}
    title={dark ? "Switch to light mode" : "Switch to dark mode"}>
    <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
  </button>;
}
