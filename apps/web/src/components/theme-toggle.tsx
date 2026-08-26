"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function preferredTheme(): Theme {
  const saved = window.localStorage.getItem("trustfix:theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const current = preferredTheme();
    setTheme(current);
    document.documentElement.dataset.theme = current;
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("trustfix:theme", next);
  }

  const nextLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return <button type="button" className={`theme-toggle ${compact ? "compact" : ""}`} onClick={toggleTheme} aria-label={nextLabel} title={nextLabel}>
    {theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}
    {!compact && <span>{theme === "dark" ? "Light" : "Dark"}</span>}
  </button>;
}
