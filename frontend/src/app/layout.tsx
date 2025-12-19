// RootLayout: required by Next.js App Router; must include <html> and <body>.

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Career-Tracker",
  description: "Job application tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Wrapping children in <Providers> so every page has access to app-wide contexts (like auth) */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
