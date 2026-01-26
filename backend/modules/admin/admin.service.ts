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

/**
 * Grant more free AI credits to a user by requestId.
 * 
 * - Resets the user's free AI usage counter to 0.
 * - Updates the latest AI Pro request status to CREDITS_GRANTED.
 * - Sends an email to the user.
 */
export async function grantMoreCredits(requestId: string) {
  const proRequest = await prisma.aiProRequest.findUnique({
    where: { id: requestId },
    include: {
      user: { select: { id: true, email: true, name: true, aiProEnabled: true } },
    },
  });

  if (!proRequest) {
    throw new AppError("Pro request not found", 404, "PRO_REQUEST_NOT_FOUND");
  }

  if (proRequest.status !== "PENDING") {
    throw new AppError(
      "Only PENDING requests can be granted credits",
      400,
      "PRO_REQUEST_NOT_PENDING"
    );
  }

  const decidedAt = new Date();

  // Reset free usage counter back to 0 (gives them a fresh set of free credits)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: proRequest.userId },
      data: { aiFreeUsesUsed: 0 },
    }),
    prisma.aiProRequest.update({
      where: { id: requestId },
      data: { status: "CREDITS_GRANTED", decidedAt },
    }),
  ]);

  await sendEmail({
    to: proRequest.user.email,
    subject: "Career-Tracker: more free AI credits granted",
    html: `
      <p>Hi${proRequest.user.name ? ` ${proRequest.user.name}` : ""},</p>
      <p>You've been granted more free AI credits for Career-Tracker.</p>
      <p>Your free AI usage counter was reset, so you can use the AI tools again.</p>
      <p>If you run out again, you can request Pro access or more credits from inside the app.</p>
    `,
    kind: "generic",
  });

  return { ok: true as const };
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
  