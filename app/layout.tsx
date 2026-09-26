import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { fr } from "@/lib/i18n/fr";

import "./globals.css";

// Typography of docs/DESIGN.md § 2: Geist for display, Inter for text, Geist Mono for ids.
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["600", "700"],
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: fr.app.name,
  description: fr.app.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geist.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
