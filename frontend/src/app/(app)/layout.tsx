// AppLayout: shared wrapper for protected app routes (e.g., applications, profile).

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen p-6">{children}</div>;
}
