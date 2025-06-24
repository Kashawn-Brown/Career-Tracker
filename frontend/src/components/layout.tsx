'use client';

import { ReactNode } from 'react';
import { ThemeToggle } from './theme-toggle';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo/Title */}
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold tracking-tight">
              Career Tracker
            </h1>
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <div className="container mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
