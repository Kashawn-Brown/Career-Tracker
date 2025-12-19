// RootLayout: required by Next.js App Router; must include <html> and <body>.

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career-Tracker",
  description: "Job application tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
