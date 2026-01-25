// Force dynamic rendering and no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

import ResetPasswordClient from "./ResetPasswordClient";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function ResetPasswordPage({ searchParams }: PageProps) {

  // Get the reset password token from the URL
  const raw = searchParams?.token;
  const token = Array.isArray(raw) ? raw[0] : raw ?? "";

  // Render the ResetPasswordClient component with the token
  return <ResetPasswordClient token={token} />;
}
