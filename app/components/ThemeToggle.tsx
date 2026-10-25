"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

// The theme itself is set before first paint by the inline script in the root
// layout. This button just reads and changes the <html data-theme> attribute.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const getSnapshot = (): Theme => document.documentElement.dataset.theme === "dark" ? "dark" : "light";
const getServerSnapshot = (): Theme => "light";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    try { window.localStorage.setItem("rscj-theme", nextTheme); } catch { /* private mode: keep the choice for this visit only */ }
  }

  const dark = theme === "dark";
  return <button type="button" className={`theme-toggle ${className}`.trim()} onClick={toggleTheme}
    aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={dark}
    title={dark ? "Switch to light mode" : "Switch to dark mode"}>
    <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
  </button>;
}
