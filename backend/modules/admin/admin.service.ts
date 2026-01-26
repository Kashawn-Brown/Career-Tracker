import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { sendEmail } from "../../lib/email.js";
import { proRequestsSelect } from "./admin.dto.js";


const NOTE_MAX = 500;


/**
 * List all Pro requests for admin.
 * 
 * - Returns all user Pro requests.
 */
export async function listProRequestsForAdmin() {
  const requests = await prisma.aiProRequest.findMany({
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }], // PENDING first if enum order matches; if not, we’ll sort in code later
    select: proRequestsSelect,
  });

  return { items: requests };
}


/**
 * Approve a Pro access request by requestId.
 * 
 * - Updates the latest AI Pro request status to APPROVED.
 * - Sends an email to the user.
 */
export async function approveProRequest(requestId: string, decisionNoteRaw?: string) {
  
  // Clean the decision note and get the current timestamp
  const ts = now();
  const decisionNote = cleanOptionalText(decisionNoteRaw);

  // Find the Pro request by requestId
  const reqRow = await prisma.aiProRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, userId: true, user: { select: { email: true } } },
  });

  // If the request is not found or is not pending, throw an error
  if (!reqRow) throw new AppError("Request not found", 404, "PRO_REQUEST_NOT_FOUND");
  if (reqRow.status !== "PENDING") throw new AppError("Request is not pending", 400, "PRO_REQUEST_NOT_PENDING");

  // Update the Pro request status to APPROVED & give the user Pro access
  await prisma.$transaction(async (db) => {
    await db.user.update({
      where: { id: reqRow.userId },
      data: { aiProEnabled: true },
    });

    await db.aiProRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", decidedAt: ts, decisionNote },
    });
  });

  // Send an email to the user to notify them that their Pro access request has been approved
  try {
    await sendEmail({
      to: reqRow.user.email,
      subject: "Career-Tracker: Pro access approved",
      kind: "generic",
      userId: reqRow.userId,
      html: `
        <p>Your Pro access request has been approved ✅</p>
        ${decisionNote ? `<p><b>Note:</b><br/>${escapeHtml(decisionNote)}</p>` : ""}
      `.trim(),
    });
  } catch (err: any) {
    console.warn("[pro] approval email failed", err?.message ?? err);
  }
}

/**
 * Deny a Pro access request by requestId.
 * 
 * - Updates the latest AI Pro request status to DENIED.
 * - Sends an email to the user.
 */
export async function denyProRequest(requestId: string, decisionNoteRaw?: string) {
  
  // Clean the decision note and get the current timestamp
  const ts = now();
  const decisionNote = cleanOptionalText(decisionNoteRaw);

  // Find the Pro request by requestId
  const reqRow = await prisma.aiProRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, userId: true, user: { select: { email: true } } },
  });

  // If the request is not found or is not pending, throw an error
  if (!reqRow) throw new AppError("Request not found", 404, "PRO_REQUEST_NOT_FOUND");
  if (reqRow.status !== "PENDING") throw new AppError("Request is not pending", 400, "PRO_REQUEST_NOT_PENDING");

  // Update the Pro request status to DENIED & send an email to the user to notify them that their Pro access request has been denied
  await prisma.aiProRequest.update({
    where: { id: requestId },
    data: { status: "DENIED", decidedAt: ts, decisionNote },
  });

  // Send an email to the user to notify them that their Pro access request has been denied
  try {
    await sendEmail({
      to: reqRow.user.email,
      subject: "Career-Tracker: Pro access request update",
      kind: "generic",
      userId: reqRow.userId,
      html: `
        <p>Your Pro access request was not approved at this time.</p>
        <p>You can request again in <b>14 days</b>.</p>
        ${decisionNote ? `<p><b>Note:</b><br/>${escapeHtml(decisionNote)}</p>` : ""}
      `.trim(),
    });
  } catch (err: any) {
    console.warn("[pro] denial email failed", err?.message ?? err);
  }

  return { ok: true };
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
  