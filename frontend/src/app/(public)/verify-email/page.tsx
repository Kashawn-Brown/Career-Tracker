// Force dynamic rendering and no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

import VerifyEmailClient from "./VerifyEmailClient";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function VerifyEmailPage({ searchParams }: PageProps) {
  
  // Get the verification token from the URL
  const raw = searchParams?.token;
  const token = Array.isArray(raw) ? raw[0] : raw ?? "";

  // Render the VerifyEmailClient component with the token
  return <VerifyEmailClient token={token} />;
}
