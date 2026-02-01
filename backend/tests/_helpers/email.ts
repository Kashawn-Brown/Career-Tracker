import { expect } from "vitest";
import { sendEmail } from "../../lib/email.js";

type EmailArgs = Parameters<typeof sendEmail>[0];

function getMockCalls(): EmailArgs[] {
  const calls = ((sendEmail as any).mock?.calls ?? []) as any[][];
  return calls.map((c) => c[0] as EmailArgs);
}

export function clearEmailMock() {
  (sendEmail as any).mockClear?.();
}

export function getEmailsByKind(kind: EmailArgs["kind"]): EmailArgs[] {
  return getMockCalls().filter((c) => c.kind === kind);
}

export function getLastEmailByKind(kind: EmailArgs["kind"]): EmailArgs {
  const emails = getEmailsByKind(kind);
  expect(emails.length, `expected at least one email of kind=${kind}`).toBeGreaterThan(0);
  return emails[emails.length - 1];
}

/**
 * Extracts the `token` query param from the first <a href="..."> link found in `html`.
 * Also asserts the URL pathname is what we expect (ex: "/verify-email").
 */
export function extractTokenFromEmailHtml(html: string, expectedPathname: string): string {
  const m = html.match(/href="([^"]+)"/);
  expect(m, "expected email HTML to contain an anchor href").not.toBeNull();

  const href = m![1];
  const url = new URL(href);

  expect(url.pathname).toBe(expectedPathname);

  const token = url.searchParams.get("token");
  expect(token, "expected token query param in email link").toBeTruthy();

  return token!;
}
