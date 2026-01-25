// Force dynamic rendering and no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

import ResetPasswordClient from "./ResetPasswordClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {

  // Get the reset password token from the URL
  const params = await searchParams;
  
  const raw = params?.token;
  const token = Array.isArray(raw) ? raw[0] : raw ?? "";

  // Render the ResetPasswordClient component with the token
  return <ResetPasswordClient token={token} />;
}
