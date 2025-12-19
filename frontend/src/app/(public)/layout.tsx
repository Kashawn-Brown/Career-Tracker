// PublicLayout: shared wrapper for public routes like /login and /signup.

// PublicLayout: centers auth pages and constrains width for a clean MVP auth shell.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
