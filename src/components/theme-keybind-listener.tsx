"use client";

import { useTheme } from "next-themes";
import { useCallback, useState } from "react";
import { useThemeKeybind } from "@/hooks/use-theme-keybind";

export function ThemeKeybindListener() {
  const { resolvedTheme, setTheme } = useTheme();
  const [status, setStatus] = useState<string | null>(null);

  const toggle = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";

    setTheme(next);
    setStatus(next === "dark" ? "Dark theme" : "Light theme");
  }, [resolvedTheme, setTheme]);

  useThemeKeybind(toggle);

  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {status}
    </span>
  );
}
