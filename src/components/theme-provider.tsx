"use client";

import { type PropsWithChildren } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeKeybindListener } from "@/components/theme-keybind-listener";

function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeKeybindListener />
      {children}
    </NextThemesProvider>
  );
}

export { ThemeProvider };
