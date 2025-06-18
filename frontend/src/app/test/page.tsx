import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-foreground">
            Task 4.1 Test Page
          </h1>
          <ThemeToggle />
        </div>

        {/* Test Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* TypeScript Test */}
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">TypeScript Test</h2>
            <p className="text-muted-foreground">
              This component is written in TypeScript with proper types.
            </p>
          </div>

          {/* Tailwind CSS Test */}
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">Tailwind CSS Test</h2>
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-full bg-red-500"></div>
              <div className="h-8 w-8 rounded-full bg-green-500"></div>
              <div className="h-8 w-8 rounded-full bg-blue-500"></div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Colored squares using Tailwind classes
            </p>
          </div>

          {/* ShadCN UI Test */}
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">ShadCN UI Test</h2>
            <div className="flex flex-wrap gap-2">
              <Button>Default Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </div>

          {/* Theme Test */}
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">Theme Test</h2>
            <p className="mb-4 text-muted-foreground">
              Toggle between light and dark mode using the button in the
              top-right corner. This text should change colors based on the
              theme.
            </p>
            <div className="rounded border bg-muted p-3">
              <p className="text-sm">
                This box uses CSS variables that adapt to the current theme.
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="rounded-lg border bg-green-50 p-6 dark:bg-green-950">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
            ✅ Task 4.1 Setup Complete!
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-green-700 dark:text-green-300">
            <li>✅ Next.js with TypeScript</li>
            <li>✅ Tailwind CSS configured</li>
            <li>✅ ShadCN UI components</li>
            <li>✅ Light/Dark theme toggle</li>
            <li>✅ ESLint and Prettier</li>
            <li>✅ Proper folder structure</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
