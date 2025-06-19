import { Layout } from '@/components/layout';

export default function TestLayoutPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Layout Test Page
          </h2>
          <p className="text-muted-foreground mb-4">
            This page tests the basic layout component with header and main
            content area.
          </p>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border p-4">
              <h3 className="font-semibold">Header</h3>
              <p className="text-sm text-muted-foreground">
                Sticky header with title and dark mode toggle
              </p>
            </div>
            <div className="rounded-md border p-4">
              <h3 className="font-semibold">Content Area</h3>
              <p className="text-sm text-muted-foreground">
                Main content area with responsive container
              </p>
            </div>
            <div className="rounded-md border p-4">
              <h3 className="font-semibold">Dark Mode</h3>
              <p className="text-sm text-muted-foreground">
                Toggle in header to test dark/light mode
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <h3 className="font-semibold">Responsive Breakpoints Test</h3>
            <div className="grid gap-2">
              <div className="block sm:hidden rounded bg-red-100 dark:bg-red-900 p-2 text-sm">
                Mobile (sm hidden)
              </div>
              <div className="hidden sm:block md:hidden rounded bg-yellow-100 dark:bg-yellow-900 p-2 text-sm">
                Tablet (sm+, md hidden)
              </div>
              <div className="hidden md:block lg:hidden rounded bg-blue-100 dark:bg-blue-900 p-2 text-sm">
                Desktop (md+, lg hidden)
              </div>
              <div className="hidden lg:block rounded bg-green-100 dark:bg-green-900 p-2 text-sm">
                Large Desktop (lg+)
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
