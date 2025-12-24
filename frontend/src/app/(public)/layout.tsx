// PublicLayout: shared wrapper for public routes like /login and /signup.
import Link from "next/link";

// PublicLayout: centers auth pages and constrains width for a clean MVP auth shell.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
     <div className="min-h-screen bg-muted/20 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="text-2xl font-semibold tracking-tight hover:underline">
            Career-Tracker
          </Link>
          <p className="text-sm text-muted-foreground">
            Track your job applications in one place.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
