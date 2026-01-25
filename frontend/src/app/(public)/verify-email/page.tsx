// Force dynamic rendering and no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

import VerifyEmailClient from "./VerifyEmailClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;


export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {

  // Get the verification token from the URL
  const params = await searchParams;
    
  const raw = params?.token;
  const token = Array.isArray(raw) ? raw[0] : raw ?? "";

  // Render the VerifyEmailClient component with the token
  return <VerifyEmailClient token={token} />;
}
