import type { Metadata } from "next";
import { Geist, Geist_Mono, Google_Sans_Flex } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { fr } from "@/lib/i18n/fr";

import "./globals.css";

// Typography of the Figma "Desktop - 11": Google Sans Flex for text (variable,
// optical size follows the font size as in Figma). Geist stays on page titles,
// Geist Mono on ids.
const googleSansFlex = Google_Sans_Flex({
  variable: "--font-google-sans-flex",
  subsets: ["latin"],
  axes: ["opsz"],
});
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["600", "700"],
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
      className={`${googleSansFlex.variable} ${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
