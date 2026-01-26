import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { sendEmail } from "../../lib/email.js";
import { aiProRequestSummarySelect } from "./pro.dto.js";

const NOTE_MAX = 500;


/**
 * Service layer: DB reads/writes for Pro access requests.
 */

/**
 * Send an email to the owner when a user requests Pro access.
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

  // If pending, do not create a new request
  if (latest?.status === "PENDING") {
    return { alreadyPro: false, request: latest };
  }

  // If denied and still in cooldown, do not create a new request
  if (
    latest?.status === "DENIED" &&
    latest.cooldownUntil &&
    latest.cooldownUntil.getTime() > Date.now()
  ) {
    return { alreadyPro: false, request: latest };
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

/**
 * Approve Pro access for a user.
 * 
 * - Updates the user's Pro access status.
 * - Updates the latest AI Pro request status to APPROVED.
 * - Sends an email to the user.
 */
export async function approveProAccess(userId: string, decisionNoteRaw?: string) {

  // Clean the decision note and get the current timestamp
  const decisionNote = cleanOptionalText(decisionNoteRaw);
  const ts = now();

  // Find the user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, aiProEnabled: true },
  });

  if (!user) throw new AppError("User not found", 404);

  // Update the user's Pro access status and the latest AI Pro request status to APPROVED
  await prisma.$transaction(async (db) => {
    await db.user.update({
      where: { id: userId },
      data: { aiProEnabled: true },
    });

    // Find the latest pending AI Pro request for the user
    const pending = await db.aiProRequest.findFirst({
      where: { userId, status: "PENDING" },
      orderBy: { requestedAt: "desc" },
      select: { id: true },
    });

    // If a pending AI Pro request exists, update its status to APPROVED
    if (pending) {
      await db.aiProRequest.update({
        where: { id: pending.id },
        data: { status: "APPROVED", decidedAt: ts, decisionNote },
      });
    }
  });

  // Email user to notify them that their Pro access request has been approved
  try {
    await sendEmail({
      to: user.email,
      subject: "Career-Tracker: Pro access approved",
      kind: "generic",
      userId,
      html: `
        <p>Your Pro access request has been approved ✅</p>
        ${decisionNote ? `<p><b>Note:</b><br/>${escapeHtml(decisionNote)}</p>` : ""}
      `.trim(),
    });
  } catch (err: any) {
    console.warn("[pro] approval email failed", err?.message ?? err);
  }

  return { ok: true };
}


/**
 * Deny Pro access for a user.
 * 
 * - Updates the latest AI Pro request status to DENIED.
 * - Sends an email to the user.
 * - Returns the cooldown until date.
 */
export async function denyProAccess(userId: string, cooldownDays?: number, decisionNoteRaw?: string) {
  const ts = now();
  const days = typeof cooldownDays === "number" ? cooldownDays : 7; // sensible default
  const decisionNote = cleanOptionalText(decisionNoteRaw);

  // Find the user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, aiProEnabled: true },
  });

  // If the user is not found or already has Pro access, throw an error
  if (!user) throw new AppError("User not found", 404);
  if (user.aiProEnabled) throw new AppError("User already has Pro access", 400, "AI_PRO_ALREADY_ENABLED");

  // Find the latest pending AI Pro request for the user
  const pending = await prisma.aiProRequest.findFirst({
    where: { userId, status: "PENDING" },
    orderBy: { requestedAt: "desc" },
    select: { id: true },
  });

  if (!pending) throw new AppError("No pending request", 404);

  const cooldownUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // Update the latest AI Pro request status to DENIED
  await prisma.aiProRequest.update({
    where: { id: pending.id },
    data: {
      status: "DENIED",
      decidedAt: ts,
      cooldownUntil,
      decisionNote,
    },
  });

  // Email user to notify them that their Pro access request has been denied
  try {
    await sendEmail({
      to: user.email,
      subject: "Career-Tracker: Pro access request update",
      kind: "generic",
      userId,
      html: `
        <p>Your Pro access request was not approved at this time.</p>
        <p>You can request again after: <b>${cooldownUntil.toISOString().slice(0, 10)}</b></p>
        ${decisionNote ? `<p><b>Note:</b><br/>${escapeHtml(decisionNote)}</p>` : ""}
      `.trim(),
    });
  } catch (err: any) {
    console.warn("[pro] denial email failed", err?.message ?? err);
  }

  return { ok: true, cooldownUntil };
}


// ----------------- Helper Functions -----------------

// Helper function to get the current timestamp
function now() {
  return new Date();
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