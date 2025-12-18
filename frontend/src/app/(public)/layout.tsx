// PublicLayout: shared wrapper for public routes like /login and /signup.

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen p-6">{children}</div>;
}
