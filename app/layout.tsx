import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist_Mono, Google_Sans_Flex } from "next/font/google";

import { EntrySplash } from "@/components/shell/entry-splash";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { fr } from "@/lib/i18n/fr";
import {
  DESIGN_STYLE_COOKIE,
  designStyleAttribute,
} from "@/lib/ui/design-style";

import "./globals.css";

// Typography of docs/DESIGN.md § 2: Google Sans Flex for display and text,
// Geist Mono for ids. Variable weight axis only: the other axes keep their defaults.
const googleSansFlex = Google_Sans_Flex({
  variable: "--font-google-sans-flex",
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  // Next has no fallback metrics for this family yet: plain system fallback.
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: fr.app.name,
  description: fr.app.description,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The style chosen in Réglages (lib/ui/design-style.ts), in the HTML itself.
  const style = designStyleAttribute(
    (await cookies()).get(DESIGN_STYLE_COOKIE)?.value,
  );
  return (
    <html
      lang="fr"
      data-style={style}
      className={`${googleSansFlex.variable} ${geistMono.variable} h-full antialiased`}
      // next-themes sets the "dark" class before the first paint, and
      // Réglages switches data-style in place (useDesignStyle).
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <EntrySplash />
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
