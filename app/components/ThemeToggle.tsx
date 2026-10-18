"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const initialTheme: Theme = window.localStorage.getItem("rscj-theme") === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = initialTheme;
    setTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("rscj-theme", nextTheme);
    setTheme(nextTheme);
  }

  const dark = theme === "dark";
  return <button type="button" className={`theme-toggle ${className}`.trim()} onClick={toggleTheme}
    aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={dark}
    title={dark ? "Switch to light mode" : "Switch to dark mode"}>
    <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
  </button>;
}
