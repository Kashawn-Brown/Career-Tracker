import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { sendEmail } from "../../lib/email.js";
import { planRequestSummarySelect } from "./plan.dto.js";
import { resolvePlanForUser, hasUnlimitedAiAccess } from "./plan-resolver.js";

const NOTE_MAX = 500;
const PENDING_REQUEST_COOLDOWN_DAYS = 3;
const DECLINED_REQUEST_COOLDOWN_DAYS = 7;

/**
 * Request more AI credits for a user.
 *
 * - Creates a PlanRequest with type MORE_CREDITS.
 * - Enforces cooldown windows to prevent request spam.
 * - Notifies the owner via email.
 */
export async function requestMoreCredits(userId: string, noteRaw?: string) {

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, plan: true },
  });

  if (!user) throw new AppError("User not found", 404);

  // PRO_PLUS users have unlimited access — no need to request credits
  const effectivePlan = resolvePlanForUser(user);
  if (hasUnlimitedAiAccess(effectivePlan)) return { alreadyUnlimited: true, request: null as any };

  const latest = await getLatestPlanRequest(userId);

  // If pending within cooldown, return the existing request rather than creating a duplicate
  if (latest?.status === "PENDING") {
    const eligibleAt = addDays(latest.requestedAt, PENDING_REQUEST_COOLDOWN_DAYS);
    if (eligibleAt.getTime() > Date.now()) {
      return { alreadyUnlimited: false, request: latest };
    }

    // Stale pending — expire it so a fresh request can be created
    await prisma.planRequest.update({
      where: { id: latest.id },
      data: {
        status: "DECLINED",
        decidedAt: new Date(),
        adminNote: "Auto-expired (no response). User re-requested.",
      },
    });
  }

  // If recently declined, enforce cooldown before allowing a new request
  if (latest?.status === "DECLINED") {
    const eligibleAt = addDays(latest.decidedAt ?? latest.requestedAt, DECLINED_REQUEST_COOLDOWN_DAYS);
    if (eligibleAt.getTime() > Date.now()) {
      return { alreadyUnlimited: false, request: latest };
    }
  }

  const note = cleanOptionalText(noteRaw);

  const created = await prisma.planRequest.create({
    data: {
      userId,
      requestType: "MORE_CREDITS",
      planAtRequest: user.plan,
      userNote: note,
    },
    select: planRequestSummarySelect,
  });

  // Notify owner — non-fatal if missing or fails
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    console.warn("[plan] OWNER_EMAIL missing; skipping owner notification email");
    return { alreadyUnlimited: false, request: created };
  }

  try {
    const safeNote = note
      ? `<p><b>Note:</b><br/>${escapeHtml(note)}</p>`
      : "<p><b>Note:</b> (none)</p>";

    await sendEmail({
      to: ownerEmail,
      subject: "Career-Tracker: New credit request",
      kind: "generic",
      userId,
      html: `
        <p><b>User:</b> ${escapeHtml(user.name ?? "(no name)")} (${escapeHtml(user.email)})</p>
        <p><b>UserId:</b> ${escapeHtml(user.id)}</p>
        <p><b>Plan:</b> ${escapeHtml(user.plan)}</p>
        ${safeNote}
        <p><b>RequestId:</b> ${escapeHtml(created.id)}</p>
      `.trim(),
    });
  } catch (err: any) {
    console.warn("[plan] owner notify email failed", err?.message ?? err);
  }

  return { alreadyUnlimited: false, request: created };
}

/**
 * Gets the latest PlanRequest for a user.
 */
export async function getLatestPlanRequest(userId: string) {
  return prisma.planRequest.findFirst({
    where: { userId },
    orderBy: { requestedAt: "desc" },
    select: planRequestSummarySelect,
  });
}


// ----------------- Helper Functions -----------------

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function cleanOptionalText(value?: string): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > NOTE_MAX ? trimmed.slice(0, NOTE_MAX) : trimmed;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}