import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { sendEmail } from "../../lib/email.js";
import { proRequestsSelect, adminUserSelect } from "./admin.dto.js";
import { Prisma, UserPlan } from "@prisma/client";
import type { ListUsersQueryType } from "./admin.schemas.js";

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
      data: { plan: UserPlan.PRO },
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
      user: { select: { id: true, email: true, name: true, plan: true } },
    },
  });

  if (!proRequest) {
    throw new AppError("Pro request not found", 404, "PRO_REQUEST_NOT_FOUND");
  }

  const decidedAt = new Date();

  await prisma.aiProRequest.update({
    where: { id: requestId },
    data: { status: "CREDITS_GRANTED", decidedAt },
  });

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

/**
 * Make a user a Pro user.
 * 
 * - Updates the user's plan to PRO.
 */
export async function makeUserPro(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { plan: UserPlan.PRO },
  });
}

/**
 * Make a user a Pro Plus user.
 * 
 * - Updates the user's plan to PRO_PLUS.
 */
export async function makeUserProPlus(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { plan: UserPlan.PRO_PLUS },
  });
}


/**
 * List users for admin with optional search + role/plan filtering.
 */
export async function listUsersForAdmin(params: ListUsersQueryType) {
  const page     = params.page     ?? 1;
  const pageSize = params.pageSize ?? 20;
  const skip     = (page - 1) * pageSize;

  // Build where clause
  const where: Prisma.UserWhereInput = {};

  if (params.role) where.role = params.role;
  if (params.plan) where.plan = params.plan;

  if (params.q) {
    where.OR = [
      { email: { contains: params.q, mode: "insensitive" } },
      { name:  { contains: params.q, mode: "insensitive" } },
    ];
  }

  // Filter to users with a pending Pro request
  if (params.isActive !== undefined) {
    where.isActive = params.isActive;
  }

  if (params.hasPendingRequest) {
    where.aiProRequests = { some: { status: "PENDING" } };
  }

  // Build orderBy — default: lastActiveAt desc
  const sortBy  = params.sortBy  ?? "lastActiveAt";
  const sortDir = params.sortDir ?? "desc";
  const orderBy: Prisma.UserOrderByWithRelationInput =
    sortBy === "createdAt" ? { createdAt: sortDir } :
    { lastActiveAt: { sort: sortDir as "asc" | "desc", nulls: "last" } };

  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: adminUserSelect,
    }),
  ]);

  // Count pending Pro requests so the UI can show a badge without a separate fetch
  const pendingProRequestCount = await prisma.aiProRequest.count({
    where: { status: "PENDING" },
  });

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    pendingProRequestCount,
  };
}

/**
 * Update a user's plan (admin only).
 * Role editing is intentionally excluded — role is authorization-sensitive.
 */
export async function updateUserPlan(userId: string, plan: UserPlan) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  // Protect admin accounts from being updated
  if (user.role === "ADMIN") {
    throw new AppError("Cannot update plan of admin users", 403, "ADMIN_PROTECTED");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { plan },
  });

  return { ok: true as const };
}

/**
 * Get a single user's detail for admin.
 */
export async function getUserDetailForAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: adminUserSelect,
  });

  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  // Get application count + status breakdown in one query
  const applications = await prisma.jobApplication.groupBy({
    by:     ["status"],
    where:  { userId },
    _count: { status: true },
  });

  // Get the # of connections for the user
  const connectionCount = await prisma.connection.count({ where: { userId } });

  // Get the status breakdown for the user's applications
  const statusBreakdown = Object.fromEntries(
    applications.map((a) => [a.status, a._count.status])
  );

  // Get the total number of applications for the user
  const applicationCount = applications.reduce((sum, a) => sum + a._count.status, 0);

  // Get all Pro requests for this user (newest first)
  const proRequests = await prisma.aiProRequest.findMany({
    where:   { userId },
    orderBy: { requestedAt: "desc" },
    select: {
      id:           true,
      status:       true,
      note:         true,
      decisionNote: true,
      requestedAt:  true,
      decidedAt:    true,
    },
  });

  // Return the user detail
  return { ...user, applicationCount, connectionCount, statusBreakdown, proRequests };
}

/**
 * Activate or deactivate a user account (admin only).
 * Admins cannot be deactivated through this endpoint.
 */
export async function setUserActiveStatus(userId: string, isActive: boolean) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, role: true },
  });

  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  // Protect admin accounts from being deactivated
  if (user.role === "ADMIN") {
    throw new AppError("Cannot change active status of admin users", 403, "ADMIN_PROTECTED");
  }

  await prisma.user.update({
    where: { id: userId },
    data:  { isActive },
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