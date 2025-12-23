import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

/**
 * App-wide font setup.
 *
 * We intentionally map these to the CSS variables used in globals.css:
 *   --font-geist-sans / --font-geist-mono
 * so Tailwind's `font-sans` / `font-mono` utilities work as expected.
 */
const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans", // Matches globals.css token mapping
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono", // Matches globals.css token mapping
  display: "swap",
});

export const metadata: Metadata = {
  title: "Career-Tracker",
  description: "Job application tracker",
};

// RootLayout: required by Next.js App Router; must include <html> and <body>.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
      
      {/* Base typography + smoother rendering; background/text colors come from globals.css */}
      <body className="min-h-screen font-sans antialiased">
        
        {/* Wrapping children in <Providers> so every page has access to app-wide contexts (like auth) */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
