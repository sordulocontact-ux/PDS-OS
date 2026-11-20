"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

import { beforePaintScriptType } from "@/components/ui/before-paint-script";

// Light or dark interface (docs/DESIGN.md § 3 quater): the "dark" class on
// <html> switches the tokens of app/globals.css. "system" by default; the
// choice is a display preference of this browser, not business data, so it
// stays in next-themes' storage rather than Supabase. Colours change at once,
// without the controls' transitions (a theme switch is not a hover).
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="pds-theme"
      // Its script before the first paint: a data block once on the client
      // (components/ui/before-paint-script.tsx).
      scriptProps={{ type: beforePaintScriptType() }}
    >
      {children}
    </NextThemesProvider>
  );
}
