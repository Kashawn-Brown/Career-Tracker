import { AppError } from "../errors/app-error.js";

export type EmailKind = "verify_email" | "reset_password" | "generic";

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  kind: EmailKind;
  userId?: string | null;
};

export async function sendEmail(args: SendEmailArgs): Promise<{ id: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || apiKey.trim() === "") {
    throw new AppError("Email is not configured (missing RESEND_API_KEY).", 500);
  }
  if (!from || from.trim() === "") {
    throw new AppError("Email is not configured (missing EMAIL_FROM).", 500);
  }

  const startedAt = Date.now();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: args.to,
        subject: args.subject,
        html: args.html,
      }),
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // ignore parse errors; keep raw text for debugging only
    }

    const ok = res.ok;
    const id = ok ? (json?.id ?? null) : null;

    // Searchable Cloud Run log record (do NOT log full email content or tokens)
    console.log(
      JSON.stringify({
        msg: "[email.send]",
        kind: args.kind,
        ok,
        status: res.status,
        durationMs: Date.now() - startedAt,
        userId: args.userId ?? null,
        to: redactEmail(args.to),
        id,
        error: ok ? null : summarizeEmailError(json, text),
      })
    );

    if (!ok) {
      throw new AppError("Failed to send email.", 502);
    }

    return { id };
  } catch (err: any) {
    // Ensure we still log an error if fetch threw before we could log a response
    console.log(
      JSON.stringify({
        msg: "[email.send]",
        kind: args.kind,
        ok: false,
        status: null,
        durationMs: Date.now() - startedAt,
        userId: args.userId ?? null,
        to: redactEmail(args.to),
        id: null,
        error: err?.message ?? "Unknown email send error",
      })
    );

    if (err instanceof AppError) throw err;
    throw new AppError("Failed to send email.", 502);
  }
}

function redactEmail(email: string): string {
  const [user, domain] = String(email ?? "").split("@");
  if (!user || !domain) return "<invalid>";
  return `${user.slice(0, 1)}***@${domain}`;
}

function summarizeEmailError(json: any, fallbackText: string): string {
  // Resend errors commonly come back as { name, message } or { error: { message } }
  const msg = json?.message ?? json?.error?.message ?? json?.error ?? null;
  if (typeof msg === "string" && msg.trim() !== "") return msg.slice(0, 240);
  return String(fallbackText ?? "Unknown error").slice(0, 240);
}
