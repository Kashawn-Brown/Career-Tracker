import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { sendEmail } from "../../lib/email.js";
import { aiProRequestSummarySelect } from "./pro.dto.js";

const NOTE_MAX = 500;
const PENDING_REQUEST_COOLDOWN_DAYS = 7;
const DENIED_REQUEST_COOLDOWN_DAYS = 14;


/**
 * Service layer: DB reads/writes for Pro access requests.
 */

/**
 * Request Pro access for a user.
 * 
 * - Creates a new AI Pro request in the database.
 * - Sends an email to the owner.
 * - Returns the latest AI Pro request for the user.
 */
export async function requestProAccess(userId: string, noteRaw?: string) {
  // Find the user
    const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, aiProEnabled: true },
  });

  if (!user) throw new AppError("User not found", 404);

  // If already Pro, just short-circuit (UI shouldn't call, but safe)
  if (user.aiProEnabled) {
    return { alreadyPro: true, request: null as any };
  }

  // Get the latest AI Pro request for the user
  const latest = await getLatestRequest(userId);

  // If pending, allow re-request after a cooldown window to avoid "stuck pending forever"
  if (latest?.status === "PENDING") {
    const eligibleAt = addDays(latest.requestedAt, PENDING_REQUEST_COOLDOWN_DAYS);

    // Still within cooldown → keep pending
    if (eligibleAt.getTime() > Date.now()) {
      return { alreadyPro: false, request: latest };
    }

    // Stale pending → expire it, then create a fresh pending request
    await prisma.aiProRequest.update({
      where: { id: latest.id },
      data: {
        status: "EXPIRED",
        decidedAt: now(),
        decisionNote: "Auto-expired (no response). User re-requested.",
      },
    });
  }

  // If denied and still in cooldown, do not create a new request
  if (latest?.status === "DENIED") {
    const eligibleAt = addDays((latest.decidedAt ?? latest.requestedAt), DENIED_REQUEST_COOLDOWN_DAYS);

    // Still within cooldown → keep denied
    if (eligibleAt.getTime() > Date.now()) {
      return { alreadyPro: false, request: latest };
    }
    
    // Cooldown elapsed → allow a new request (but do NOT mutate the denied record)
  }

  // Clean the note and create a new AI Pro request
  const note = cleanOptionalText(noteRaw);

  const created = await prisma.aiProRequest.create({
    data: { userId, note },
    select: aiProRequestSummarySelect,
  });

  // Email owner. If missing env / fails, request still exists in DB.
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    console.warn("[pro] OWNER_EMAIL missing; skipping owner notification email");
    return { alreadyPro: false, request: created };
  }

  try {
    const safeNote = note ? `<p><b>Note:</b><br/>${escapeHtml(note)}</p>` : "<p><b>Note:</b> (none)</p>";

    await sendEmail({
      to: ownerEmail,
      subject: "Career-Tracker: New Pro access request",
      kind: "generic",
      userId,
      html: `
        <p><b>User:</b> ${escapeHtml(user.email)}</p>
        <p><b>UserId:</b> ${escapeHtml(user.id)}</p>
        ${safeNote}
        <p><b>RequestId:</b> ${escapeHtml(created.id)}</p>
      `.trim(),
    });
  } catch (err: any) {
    console.warn("[pro] owner notify email failed", err?.message ?? err);
  }

  return { alreadyPro: false, request: created };
}




// ----------------- Helper Functions -----------------

// Helper function to get the current timestamp
function now() {
  return new Date();
}

// Helper function to add days to a date
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// Helper function to clean an optional text value
function cleanOptionalText(value?: string): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > NOTE_MAX ? trimmed.slice(0, NOTE_MAX) : trimmed;
}

// Helper function to escape HTML characters
function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Helper function to get the latest AI Pro request for a user
async function getLatestRequest(userId: string) {
  return prisma.aiProRequest.findFirst({
    where: { userId },
    orderBy: { requestedAt: "desc" },
    select: aiProRequestSummarySelect,
  });
}